import postgrest from 'mithril-postgrest';
import m from 'mithril';
import _ from 'underscore';
import models from '../models';

const currentContribution = m.prop({});

const getUserProjectContributions = (user_id, project_id, states) => {
    const vm = postgrest.filtersVM({
        user_id: 'eq',
        project_id: 'eq',
        state: 'in'
    });

    vm.user_id(user_id);
    vm.project_id(project_id);
    vm.state(states);

    const lProjectContributions = postgrest.loaderWithToken(models.userContribution.getPageOptions(vm.parameters()));

    return lProjectContributions.load();
};

const getCurrentContribution = () => {
    const root = document.getElementById('application'),
        data = root && root.getAttribute('data-contribution');

    if (data) {
        currentContribution(JSON.parse(data));

        m.redraw(true);

        return currentContribution;
    }
    return false;
};

const wasConfirmed = contribution => _.contains(['paid', 'pending_refund', 'refunded'], contribution.state);

const canShowReceipt = contribution => wasConfirmed(contribution);

const canShowSlip = contribution => contribution.payment_method == 'BoletoBancario' && contribution.waiting_payment;

const canGenerateSlip = contribution => contribution.payment_method === 'BoletoBancario' &&
    contribution.state === 'pending' &&
    contribution.project_state === 'online' &&
    !contribution.reward_sold_out &&
    !contribution.waiting_payment;

const contributionVM = {
    getCurrentContribution,
    canShowReceipt,
    canGenerateSlip,
    canShowSlip,
    getUserProjectContributions
};

export default contributionVM;
