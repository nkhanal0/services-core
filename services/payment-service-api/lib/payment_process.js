/**
 * PaymentProcess module
 * @module lib/payment_process
 */

'use strict';
const pagarme = require('pagarme');
const R = require('ramda');
const { DateTime } = require('luxon');
const { genAFMetadata } = require('./antifraud_context_gen');
const { generateDalContext } = require('./dal');

/*
 * gatewayClient
 * Gateway client instance
 * @return {Object} pagarme_client
 */
const gatewayClient = async () => {
    return await pagarme.client.connect({
        api_key: process.env.GATEWAY_API_KEY
    });
};

/*
 * isForeign(ctx)
 * Check if payment is_international value return boolean
 * @param { Object } ctx - generated context for execution (generated on dal module)
 * @return { boolean }
 */
const isForeign = (ctx) => {
    return  (ctx.payment.data.is_international || false);
};

/*
 * buildTransactionData(context)
 * build a object with transaction attributes
 * @param { Object } context - generated context from dal execution
 * @return { Object } - object with transaction attributes
 */
const buildTransactionData = (context) => {
    const payment = context.payment
    const isCreditCard = payment.data.payment_method === 'credit_card'

    return {
        postback_url: process.env.POSTBACK_URL,
        async :false,

        payment_method: payment.data.payment_method,
        amount: payment.data.amount,

        ...(isCreditCard ? cardTransactionData(context) : bankSlipTransactionData(context)),
        ...buildTransactionMetadata(payment)
    }
}

/*
 * cardTransactionData(context)
 * build a object with credit card transaction attributes
 * @param { Object } context - generated context from dal execution
 * @return { Object } - object with credit card transaction attributes
 */
const cardTransactionData = (context) => {
    const payment = context.payment
    const transactionDescription = (context.project.permalink || '').substring(0, 13)
    const cardHash = payment.data.card_hash

    return {
        capture: false,
        soft_descriptor: transactionDescription,
        ...(cardHash ? { card_hash: card_hash } : { card_id: context.payment_card.gateway_data.id })
    }
}

/*
 * bankSlipTransactionData(context)
 * build a object with bank slip transaction attributes
 * @param { Object } context - generated context from dal execution
 * @return { Object } - object with bank slip transaction attributes
 */
const bankSlipTransactionData = (context) => {
    const payment = context.payment
    const customer = payment.data.customer
    const isIndividual = customer.document_number.length === 11

    return {
        customer: {
            name: customer.name,
            type: isIndividual ? 'individual' : 'corporation',
            documents: [
                {
                    type: isIndividual ? 'cpf' : 'cnpj',
                    number: customer.document_number
                }
            ]
        }
    }
            }

/*
 * buildTransactionMetadata(context)
 * build a object with metadata transaction attributes
 * @param { Object } context - generated context from dal execution
 * @return { Object } - object with metadata transaction attributes
 */
const buildTransactionMetadata = (payment) => {
    return {
        metadata: {
            payment_id: payment.id,
            project_id: payment.project_id,
            platform_id: payment.platform_id,
            subscription_id: payment.subscription_id,
            user_id: payment.user_id,
            cataloged_at: payment.created_at
        }
    }
    }

/*
 * expirationDate(accTime, plusDays)
 * calculate expiration date for boleto
 * @param { DateTime } accTime - DateTime.local() when not defined
 * @param { integer } plusDays - Total of days from time
 * @return { string } - DateTime.toISO()
 */
const expirationDate = (accTime, plusDays) => {
    let time = (accTime||DateTime.local()).setZone(
        'America/Sao_Paulo'
    ).plus({days: plusDays});

    const isWeeked = R.any(x => x === '6' || x === '7');

    if(isWeeked(time.toFormat('E'))) {
        return expirationDate(time, 2);
    } else {
        return time.toISO();
    }
};

/*
 * createGatewayTransaction(transactionData)
 * transactionData = object generated on genTransactionData(ctx)
 * Create a transaction on gateway and return the transaction object
 */
const createGatewayTransaction = async (transactionData) => {
    let client = await gatewayClient();
    let transaction = await client.withVersion('2019-09-01').transactions.create(transactionData);
    return transaction;
};

/*
 * fetchTransactionPayables(transactionId)
 * get payables from a transaction
 * @param { integer } transactionId
 * @return { Object } transaction payables object
 */
const fetchTransactionPayables = async (transactionId) => {
    let client = await gatewayClient();
    let payables = await client.payables.find({ transactionId: transactionId });
    return payables;
};

/*
 * processGeneratedCard(paymentId)
 * start processing a new payment on gateway
 * @param { Object } dbclient - postgres connection client
 * @param { uuid_v4 } paymentId - catalog_payment id
 *
 * @return { Object } transaction, payables, payment, subscription - the gateway generated transaction
 */
const processPayment = async (dbclient, paymentId) => {
    const dalCtx = generateDalContext(dbclient),
        ctx = await dalCtx.loadPaymentContext(paymentId),
        hasSubcription = !R.isNil(ctx.subscription),
        subscriptionHasCard = hasSubcription && !R.isNil(ctx.subscription.credit_card_id),
        shouldSaveCard = (ctx.payment.data.save_card && !hasSubcription) || (hasSubcription && subscriptionHasCard),
        anyTransactionInInitialStatus = (s => s === 'waiting_payment' || s === 'processing'),
        anyTransactionInpaidOrRefused = (s => s === 'paid' || s === 'refused');

    try {
        await dbclient.query('BEGIN;');
        const transaction = await createGatewayTransaction(buildTransactionData(ctx))
        const payables = await fetchTransactionPayables(transaction.id)
        const transaction_reason = { transaction, payables }
        const isPendingPayment = anyTransactionInInitialStatus(transaction.status);

        await dalCtx.updateGatewayDataOnPayment(paymentId, transaction_reason);
        await dalCtx.buildGatewayGeneralDataOnPayment(paymentId, transaction, payables);

        // create credit card when save_card is true
        // or when subscription has no credit_card_id
        if(!R.isNil(transaction.card) && shouldSaveCard) {
            const card = await dalCtx.createCardFromPayment(paymentId);
            if(hasSubcription) {
                await dalCtx.changeSubscriptionCard(ctx.payment.subscription_id, card.id);
            };
        };

        // should notify when slip on waitin_payment or processing
        if(hasSubcription && isPendingPayment && transaction.payment_method === 'boleto') {
            await dalCtx.notificationServiceNotify('slip_subscription_payment', {
                relations: {
                    catalog_payment_id: paymentId,
                    subscription_id: ctx.payment.subscription_id,
                    project_id: ctx.payment.project_id,
                    reward_id: ctx.payment.reward_id,
                    user_id: ctx.payment.user_id
                }
            });
        };

        // transition payment when status is not initial state
        if ( !isPendingPayment ) {
            await dalCtx.paymentTransitionTo(paymentId, transaction.status, transaction_reason);


            // transition subscription when have one and status is paid or refused
            if ( hasSubcription && transaction.status == 'paid') {
                await dalCtx.subscriptionTransitionTo(ctx.payment.subscription_id, 'active', transaction_reason);
            };
        };


        await dbclient.query('COMMIT;');
        return {
            transaction,
            payables,
            payment: await dalCtx.findPayment(paymentId),
            subscription: (hasSubcription ? await dalCtx.findSubscription(ctx.payment.subscription_id) : undefined)

        };
    } catch(err) {
        await dbclient.query('ROLLBACK');
        if(err.response && err.response.errors) {
            console.log('error on processing', err.response.errors);
            try {
                await dbclient.query('BEGIN;')
                await dalCtx.paymentTransitionTo(paymentId, 'error', err.response.errors);
                await dalCtx.updateGatewayDataOnPayment(paymentId, err.response.errors);
                await dbclient.query('COMMIT;')
            } catch(db_err) {
                console.log('error when transition payment to error -> ', db_err);
            }
        }
        throw err;
    };
};

module.exports = {
    gatewayClient,
    isForeign,
    buildTransactionData,
    expirationDate,
    createGatewayTransaction,
    fetchTransactionPayables,
    processPayment
};
