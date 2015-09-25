"use strict";

window.c = (function () {
  return {
    models: {},
    pages: {},
    contribution: {},
    admin: {},
    project: {},
    h: {}
  };
})();
'use strict';

window.c.h = (function (m, moment) {
  //Date Helpers
  var momentify = function momentify(date, format) {
    format = format || 'DD/MM/YYYY';
    return date ? moment(date).format(format) : 'no date';
  },
      momentFromString = function momentFromString(date, format) {
    var european = moment(date, format || 'DD/MM/YYYY');
    return european.isValid() ? european : moment(date);
  },

  //Number formatting helpers
  generateFormatNumber = function generateFormatNumber(s, c) {
    return function (number, n, x) {
      if (number === null || number === undefined) {
        return null;
      }

      var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
          num = number.toFixed(Math.max(0, ~ ~n));
      return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
    };
  },
      formatNumber = generateFormatNumber('.', ','),

  //Object manipulation helpers
  generateRemaingTime = function generateRemaingTime(project) {
    var remainingTextObj = m.prop({}),
        translatedTime = {
      days: 'dias',
      minutes: 'minutos',
      hours: 'horas',
      seconds: 'segundos'
    };

    remainingTextObj({
      unit: translatedTime[project.remaining_time.unit || 'seconds'],
      total: project.remaining_time.total
    });

    return remainingTextObj;
  },
      toggleProp = function toggleProp(defaultState, alternateState) {
    var p = m.prop(defaultState);
    p.toggle = function () {
      p(p() === alternateState ? defaultState : alternateState);
    };

    return p;
  },
      idVM = m.postgrest.filtersVM({ id: 'eq' }),

  //Templates
  loader = function loader() {
    return m('.u-text-center.u-margintop-30[style="margin-bottom:-110px;"]', [m('img[alt="Loader"][src="https://s3.amazonaws.com/catarse.files/loader.gif"]')]);
  };

  return {
    momentify: momentify,
    momentFromString: momentFromString,
    formatNumber: formatNumber,
    idVM: idVM,
    toggleProp: toggleProp,
    generateRemaingTime: generateRemaingTime,
    loader: loader
  };
})(window.m, window.moment);
'use strict';

window.c.models = (function (m) {
  var contributionDetail = m.postgrest.model('contribution_details'),
      projectDetail = m.postgrest.model('project_details'),
      contributions = m.postgrest.model('contributions'),
      teamTotal = m.postgrest.model('team_totals'),
      projectContributionsPerDay = m.postgrest.model('project_contributions_per_day'),
      projectContributionsPerLocation = m.postgrest.model('project_contributions_per_location'),
      project = m.postgrest.model('projects'),
      teamMember = m.postgrest.model('team_members'),
      statistic = m.postgrest.model('statistics');
  teamMember.pageSize(40);
  project.pageSize(3);

  return {
    contributionDetail: contributionDetail,
    projectDetail: projectDetail,
    contributions: contributions,
    teamTotal: teamTotal,
    teamMember: teamMember,
    project: project,
    projectContributionsPerDay: projectContributionsPerDay,
    projectContributionsPerLocation: projectContributionsPerLocation,
    statistic: statistic
  };
})(window.m);
'use strict';

window.c.AdminContribution = (function (m, h) {
  return {
    view: function view(ctrl, args) {
      var contribution = args.item;
      return m('.w-row.admin-contribution', [m('.fontweight-semibold.lineheight-tighter.u-marginbottom-10.fontsize-small', 'R$' + contribution.value), m('.fontsize-smallest.fontcolor-secondary', h.momentify(contribution.created_at, 'DD/MM/YYYY HH:mm[h]')), m('.fontsize-smallest', ['ID do Gateway: ', m('a.alt-link[target="_blank"][href="https://dashboard.pagar.me/#/transactions/' + contribution.gateway_id + '"]', contribution.gateway_id)])]);
    }
  };
})(window.m, window.c.h);
'use strict';

window.c.AdminDetail = (function (m, _, c) {
  return {
    controller: function controller() {},
    view: function view(ctrl, args) {
      var actions = args.actions,
          item = args.item;
      return m('#admin-contribution-detail-box', [m('.divider.u-margintop-20.u-marginbottom-20'), m('.w-row.u-marginbottom-30', _.map(actions, function (action) {
        return m.component(c[action.component], { data: action.data, item: args.item });
      })), m('.w-row.card.card-terciary.u-radius', [m.component(c.AdminTransaction, { contribution: item }), m.component(c.AdminTransactionHistory, { contribution: item }), m.component(c.AdminReward, { contribution: item, key: item.key })])]);
    }
  };
})(window.m, window._, window.c);
'use strict';

window.c.AdminFilter = (function (c, m, _, h) {
  return {
    controller: function controller() {
      return {
        toggler: h.toggleProp(false, true)
      };
    },
    view: function view(ctrl, args) {
      var filterBuilder = args.filterBuilder,
          main = _.findWhere(filterBuilder, { component: 'FilterMain' });

      return m('#admin-contributions-filter.w-section.page-header', [m('.w-container', [m('.fontsize-larger.u-text-center.u-marginbottom-30', 'Apoios'), m('.w-form', [m('form', {
        onsubmit: args.submit
      }, [_.findWhere(filterBuilder, { component: 'FilterMain' }) ? m.component(c[main.component], main.data) : '', m('.u-marginbottom-20.w-row', m('button.w-col.w-col-12.fontsize-smallest.link-hidden-light[style="background: none; border: none; outline: none; text-align: left;"][type="button"]', {
        onclick: ctrl.toggler.toggle
      }, 'Filtros avançados  >')), ctrl.toggler() ? m('#advanced-search.w-row.admin-filters', [_.map(filterBuilder, function (f) {
        return f.component !== 'FilterMain' ? m.component(c[f.component], f.data) : '';
      })]) : ''])])])]);
    }
  };
})(window.c, window.m, window._, window.c.h);
'use strict';

window.c.AdminInputAction = (function (m, h, c) {
  return {
    controller: function controller(args) {
      var builder = args.data,
          complete = m.prop(false),
          error = m.prop(false),
          fail = m.prop(false),
          data = {},
          item = args.item,
          key = builder.property,
          newValue = m.prop(builder.forceValue || '');

      h.idVM.id(item[builder.updateKey]);

      var l = m.postgrest.loaderWithToken(builder.model.patchOptions(h.idVM.parameters(), data));

      var updateItem = function updateItem(res) {
        _.extend(item, res[0]);
        complete(true);
        error(false);
      };

      var submit = function submit() {
        data[key] = newValue();
        l.load().then(updateItem, error);
        return false;
      };

      var unload = function unload(el, isinit, context) {
        context.onunload = function () {
          complete(false);
          error(false);
          newValue(builder.forceValue || '');
        };
      };

      return {
        complete: complete,
        error: error,
        l: l,
        newValue: newValue,
        submit: submit,
        toggler: h.toggleProp(false, true),
        unload: unload
      };
    },
    view: function view(ctrl, args) {
      var data = args.data,
          btnValue = ctrl.l() ? 'por favor, aguarde...' : data.callToAction;

      return m('.w-col.w-col-2', [m('button.btn.btn-small.btn-terciary', {
        onclick: ctrl.toggler.toggle
      }, data.outerLabel), ctrl.toggler() ? m('.dropdown-list.card.u-radius.dropdown-list-medium.zindex-10', { config: ctrl.unload }, [m('form.w-form', {
        onsubmit: ctrl.submit
      }, !ctrl.complete() ? [m('label', data.innerLabel), !data.forceValue ? m('input.w-input.text-field[type="text"][placeholder="' + data.placeholder + '"]', { onchange: m.withAttr('value', ctrl.newValue), value: ctrl.newValue() }) : '', m('input.w-button.btn.btn-small[type="submit"][value="' + btnValue + '"]')] : !ctrl.error() ? [m('.w-form-done[style="display:block;"]', [m('p', 'Apoio transferido com sucesso!')])] : [m('.w-form-error[style="display:block;"]', [m('p', 'Houve um problema na requisição. O apoio não foi transferido!')])])]) : '']);
    }
  };
})(window.m, window.c.h, window.c);
'use strict';

window.c.AdminItem = (function (m, _, h, c) {
  return {
    controller: function controller(args) {

      var displayDetailBox = h.toggleProp(false, true);

      return {
        displayDetailBox: displayDetailBox
      };
    },

    view: function view(ctrl, args) {
      var item = args.item;

      return m('.w-clearfix.card.u-radius.u-marginbottom-20.results-admin-items', [m('.w-row', [_.map(args.builder, function (desc) {
        return m(desc.wrapperClass, [m.component(c[desc.component], { item: item, key: item.key })]);
      })]), m('button.w-inline-block.arrow-admin.fa.fa-chevron-down.fontcolor-secondary', { onclick: ctrl.displayDetailBox.toggle }), ctrl.displayDetailBox() ? m.component(c.AdminDetail, { item: item, actions: args.actions, key: item.key }) : '']);
    }
  };
})(window.m, window._, window.c.h, window.c);
'use strict';

window.c.AdminList = (function (m, h, c) {
  var admin = c.admin;
  return {
    controller: function controller(args) {
      var list = args.vm.list;
      if (!list.collection().length && list.firstPage) {
        list.firstPage().then(null, function (serverError) {
          args.vm.error(serverError.message);
        });
      }
    },

    view: function view(ctrl, args) {
      var list = args.vm.list,
          error = args.vm.error;
      return m('.w-section.section', [m('.w-container', error() ? m('.card.card-error.u-radius.fontweight-bold', error()) : [m('.w-row.u-marginbottom-20', [m('.w-col.w-col-9', [m('.fontsize-base', list.isLoading() ? 'Buscando apoios...' : [m('span.fontweight-semibold', list.total()), ' apoios encontrados'])])]), m('#admin-contributions-list.w-container', [list.collection().map(function (item) {
        return m.component(c.AdminItem, { builder: args.itemBuilder, actions: args.itemActions, item: item, key: item.key });
      }), m('.w-section.section', [m('.w-container', [m('.w-row', [m('.w-col.w-col-2.w-col-push-5', [!list.isLoading() ? m('button#load-more.btn.btn-medium.btn-terciary', { onclick: list.nextPage }, 'Carregar mais') : h.loader()])])])])])])]);
    }
  };
})(window.m, window.c.h, window.c);
'use strict';

window.c.AdminProjectDetailsCard = (function (m, h) {
  return {
    controller: function controller(args) {
      var project = args.resource,
          generateStatusText = function generateStatusText() {
        var statusTextObj = m.prop({}),
            statusText = {
          online: { cssClass: 'text-success', text: 'NO AR' },
          successful: { cssClass: 'text-success', text: 'FINANCIADO' },
          failed: { cssClass: 'text-error', text: 'NÃO FINANCIADO' },
          waiting_funds: { cssClass: 'text-waiting', text: 'AGUARDANDO' },
          rejected: { cssClass: 'text-error', text: 'RECUSADO' },
          draft: { cssClass: '', text: 'RASCUNHO' },
          in_analysis: { cssClass: '', text: 'EM ANÁLISE' },
          approved: { cssClass: 'text-success', text: 'APROVADO' }
        };

        statusTextObj(statusText[project.state]);

        return statusTextObj;
      };

      return {
        project: project,
        statusTextObj: generateStatusText(),
        remainingTextObj: h.generateRemaingTime(project)
      };
    },

    view: function view(ctrl) {
      var project = ctrl.project,
          progress = project.progress.toFixed(2),
          statusTextObj = ctrl.statusTextObj(),
          remainingTextObj = ctrl.remainingTextObj();

      return m('.project-details-card.card.u-radius.card-terciary.u-marginbottom-20', [m('div', [m('.fontsize-small.fontweight-semibold', [m('span.fontcolor-secondary', 'Status:'), ' ', m('span', { 'class': statusTextObj.cssClass }, statusTextObj.text), ' ']), (function () {
        if (project.is_published) {
          return [m('.meter.u-margintop-20.u-marginbottom-10', [m('.meter-fill', { style: { width: (progress > 100 ? 100 : progress) + '%' } })]), m('.w-row', [m('.w-col.w-col-3.w-col-small-3.w-col-tiny-6', [m('.fontweight-semibold.fontsize-large.lineheight-tight', progress + '%'), m('.fontcolor-secondary.lineheight-tighter.fontsize-small.u-marginbottom-10', 'financiado')]), m('.w-col.w-col-3.w-col-small-3.w-col-tiny-6', [m('.fontweight-semibold.fontsize-large.lineheight-tight', ['R$ ' + h.formatNumber(project.pledged, 2)]), m('.fontcolor-secondary.lineheight-tighter.fontsize-small.u-marginbottom-10', 'levantados')]), m('.w-col.w-col-3.w-col-small-3.w-col-tiny-6', [m('.fontweight-semibold.fontsize-large.lineheight-tight', project.total_contributions), m('.fontcolor-secondary.lineheight-tighter.fontsize-small', 'apoios')]), m('.w-col.w-col-3.w-col-small-3.w-col-tiny-6', [m('.fontweight-semibold.fontsize-large.lineheight-tight', remainingTextObj.total), m('.fontcolor-secondary.lineheight-tighter.fontsize-small', remainingTextObj.unit + ' restantes')])])];
        }
      })()])]);
    }
  };
})(window.m, window.c.h);
'use strict';

window.c.AdminProjectDetailsExplanation = (function (m, h) {
  return {
    controller: function controller(args) {
      var explanation = function explanation(resource) {
        var stateText = {
          online: [m('span', 'Você pode receber apoios até 23hs59min59s do dia ' + h.momentify(resource.zone_expires_at) + '. Lembre-se, é tudo-ou-nada e você só levará os recursos captados se bater a meta dentro desse prazo.')],
          successful: [m('span.fontweight-semibold', resource.user.name + ', comemore que você merece!'), ' Seu projeto foi bem sucedido e agora é a hora de iniciar o trabalho de relacionamento com seus apoiadores! ', 'Atenção especial à entrega de recompensas. Prometeu? Entregue! Não deixe de olhar a seção de pós-projeto do ', m('a.alt-link[href="/guides"]', 'Guia dos Realizadores'), ' e de informar-se sobre ', m('a.alt-link[href="http://suporte.catarse.me/hc/pt-br/articles/202037493-FINANCIADO-Como-ser%C3%A1-feito-o-repasse-do-dinheiro-"][target="_blank"]', 'como o repasse do dinheiro será feito.')],
          waiting_funds: [m('span.fontweight-semibold', resource.user.name + ', estamos processando os últimos pagamentos!'), ' Seu projeto foi finalizado em ' + h.momentify(resource.zone_expires_at) + ' e está aguardando confirmação de boletos e pagamentos. ', 'Devido à data de vencimento de boletos, projetos que tiveram apoios de última hora ficam por até 4 dias úteis nesse status, contados a partir da data de finalização do projeto. ', m('a.alt-link[href="http://suporte.catarse.me/hc/pt-br/articles/202037493-FINANCIADO-Como-ser%C3%A1-feito-o-repasse-do-dinheiro-"][target="_blank"]', 'Entenda como o repasse de dinheiro é feito para projetos bem sucedidos.')],
          failed: [m('span.fontweight-semibold', resource.user.name + ', não desanime!'), ' Seu projeto não bateu a meta e sabemos que isso não é a melhor das sensações. Mas não desanime. ', 'Encare o processo como um aprendizado e não deixe de cogitar uma segunda tentativa. Não se preocupe, todos os seus apoiadores receberão o dinheiro de volta. ', m('a.alt-link[href="http://suporte.catarse.me/hc/pt-br/articles/202365507-Regras-e-funcionamento-dos-reembolsos-estornos"][target="_blank"]', 'Entenda como fazemos estornos e reembolsos.')],
          rejected: [m('span.fontweight-semibold', resource.user.name + ', infelizmente não foi desta vez.'), ' Você enviou seu projeto para análise do Catarse e entendemos que ele não está de acordo com o perfil do site. ', 'Ter um projeto recusado não impede que você envie novos projetos para avaliação ou reformule seu projeto atual. ', 'Converse com nosso atendimento! Recomendamos que você dê uma boa olhada nos ', m('a.alt-link[href="http://suporte.catarse.me/hc/pt-br/articles/202387638-Diretrizes-para-cria%C3%A7%C3%A3o-de-projetos"][target="_blank"]', 'critérios da plataforma'), ' e no ', m('a.alt-link[href="/guides"]', 'guia dos realizadores'), '.'],
          draft: [m('span.fontweight-semibold', resource.user.name + ', construa o seu projeto!'), ' Quanto mais cuidadoso e bem formatado for um projeto, maiores as chances de ele ser bem sucedido na sua campanha de captação. ', 'Antes de enviar seu projeto para a nossa análise, preencha todas as abas ao lado com carinho. Você pode salvar as alterações e voltar ao rascunho de projeto quantas vezes quiser. ', 'Quando tudo estiver pronto, clique no botão ENVIAR e entraremos em contato para avaliar o seu projeto.'],
          in_analysis: [m('span.fontweight-semibold', resource.user.name + ', você enviou seu projeto para análise em ' + h.momentify(resource.sent_to_analysis_at) + ' e receberá nossa avaliação em até 4 dias úteis após o envio!'), ' Enquanto espera a sua resposta, você pode continuar editando o seu projeto. ', 'Recomendamos também que você vá coletando feedback com as pessoas próximas e planejando como será a sua campanha.'],
          approved: [m('span.fontweight-semibold', resource.user.name + ', seu projeto foi aprovado!'), ' Para colocar o seu projeto no ar é preciso apenas que você preencha os dados necessários na aba ', m('a.alt-link[href="#user_settings"]', 'Conta'), '. É importante saber que cobramos a taxa de 13% do valor total arrecadado apenas por projetos bem sucedidos. Entenda ', m('a.alt-link[href="http://suporte.catarse.me/hc/pt-br/articles/202037493-FINANCIADO-Como-ser%C3%A1-feito-o-repasse-do-dinheiro-"][target="_blank"]', 'como fazemos o repasse do dinheiro.')]
        };

        return stateText[resource.state];
      };

      return {
        explanation: explanation(args.resource)
      };
    },
    view: function view(ctrl, args) {
      return m('p.' + args.resource.state + '-project-text.fontsize-small.lineheight-loose', ctrl.explanation);
    }
  };
})(window.m, window.c.h);
'use strict';

window.c.AdminProject = (function (m, h) {
  return {
    view: function view(ctrl, args) {
      var project = args.item;
      return m('.w-row.admin-project', [m('.w-col.w-col-3.w-col-small-3.u-marginbottom-10', [m('img.thumb-project.u-radius[src=' + project.project_img + '][width=50]')]), m('.w-col.w-col-9.w-col-small-9', [m('.fontweight-semibold.fontsize-smaller.lineheight-tighter.u-marginbottom-10', [m('a.alt-link[target="_blank"][href="/' + project.permalink + '"]', project.project_name)]), m('.fontsize-smallest.fontweight-semibold', project.project_state), m('.fontsize-smallest.fontcolor-secondary', h.momentify(project.project_online_date) + ' a ' + h.momentify(project.project_expires_at))])]);
    }
  };
})(window.m, window.c.h);
'use strict';

window.c.AdminRadioAction = (function (m, h, c) {
  return {
    controller: function controller(args) {
      var builder = args.data,
          complete = m.prop(false),
          data = {},

      //TODO: Implement a descriptor to abstract the initial description
      description = m.prop(args.item.reward.description || ''),
          error = m.prop(false),
          fail = m.prop(false),
          item = args.item,
          key = builder.getKey,
          newValue = m.prop(''),
          getFilter = {},
          setFilter = {},
          radios = m.prop(),
          getKey = builder.getKey,
          getAttr = builder.radios,
          updateKey = builder.updateKey;

      setFilter[updateKey] = 'eq';
      var setVM = m.postgrest.filtersVM(setFilter);
      setVM[updateKey](item[updateKey]);

      getFilter[getKey] = 'eq';
      var getVM = m.postgrest.filtersVM(getFilter);
      getVM[getKey](item[getKey]);

      var getLoader = m.postgrest.loaderWithToken(builder.getModel.getRowOptions(getVM.parameters()));

      var setLoader = m.postgrest.loaderWithToken(builder.updateModel.patchOptions(setVM.parameters(), data));

      var updateItem = function updateItem(data) {
        _.extend(item, data[0]);
        complete(true);
      };

      var fetch = function fetch() {
        getLoader.load().then(function (item) {
          radios(item[0][getAttr]);
        }, error);
      };

      var submit = function submit() {
        if (newValue()) {
          data[builder.property] = newValue();
          setLoader.load().then(updateItem, error);
        }
        return false;
      };

      var unload = function unload(el, isinit, context) {
        context.onunload = function () {
          complete(false);
          error(false);
          newValue('');
        };
      };

      var setDescription = function setDescription(text) {
        description(text);
        m.redraw();
      };

      fetch();

      return {
        complete: complete,
        description: description,
        setDescription: setDescription,
        error: error,
        setLoader: setLoader,
        getLoader: getLoader,
        newValue: newValue,
        submit: submit,
        toggler: h.toggleProp(false, true),
        unload: unload,
        radios: radios
      };
    },
    view: function view(ctrl, args) {
      var data = args.data,
          btnValue = ctrl.setLoader() || ctrl.getLoader() ? 'por favor, aguarde...' : data.callToAction;

      return m('.w-col.w-col-2', [m('button.btn.btn-small.btn-terciary', {
        onclick: ctrl.toggler.toggle
      }, data.outerLabel), ctrl.toggler() ? m('.dropdown-list.card.u-radius.dropdown-list-medium.zindex-10', { config: ctrl.unload }, [m('form.w-form', {
        onsubmit: ctrl.submit
      }, !ctrl.complete() ? [ctrl.radios() ? _.map(ctrl.radios(), function (radio, index) {
        var set = function set() {
          ctrl.newValue(radio.id);
          ctrl.setDescription(radio.description);
        };
        var selected = radio.id === args.item.reward.id ? true : false;

        return m('.w-radio', [m('input#r-' + index + '.w-radio-input[type=radio][name="admin-radio"][value="' + radio.id + '"]' + (selected ? '[checked]' : ''), {
          onclick: set
        }), m('label.w-form-label[for="r-' + index + '"]', 'R$' + radio.minimum_value)]);
      }) : h.loader(), m('strong', 'Descrição'), m('p', ctrl.description()), m('input.w-button.btn.btn-small[type="submit"][value="' + btnValue + '"]')] : !ctrl.error() ? [m('.w-form-done[style="display:block;"]', [m('p', 'Recompensa alterada com sucesso!')])] : [m('.w-form-error[style="display:block;"]', [m('p', 'Houve um problema na requisição. O apoio não foi transferido!')])])]) : '']);
    }
  };
})(window.m, window.c.h, window.c);
'use strict';

window.c.AdminReward = (function (m, h, _) {
  return {
    view: function view(ctrl, args) {
      var reward = args.contribution.reward || {},
          available = parseInt(reward.paid_count) + parseInt(reward.waiting_payment_count);

      return m('.w-col.w-col-4', [m('.fontweight-semibold.fontsize-smaller.lineheight-tighter.u-marginbottom-20', 'Recompensa'), m('.fontsize-smallest.lineheight-looser', _.isEmpty(reward) ? 'Apoio sem recompensa.' : ['ID: ' + reward.id, m('br'), 'Valor mínimo: R$' + h.formatNumber(reward.minimum_value, 2, 3), m('br'), m.trust('Disponíveis: ' + available + ' / ' + (reward.maximum_contributions || '&infin;')), m('br'), 'Aguardando confirmação: ' + reward.waiting_payment_count, m('br'), 'Descrição: ' + reward.description])]);
    }
  };
})(window.m, window.c.h, window._);
'use strict';

window.c.AdminTransactionHistory = (function (m, h, _) {
  return {
    controller: function controller(args) {
      var contribution = args.contribution,
          mapEvents = _.reduce([{ date: contribution.paid_at, name: 'Apoio confirmado' }, { date: contribution.pending_refund_at, name: 'Reembolso solicitado' }, { date: contribution.refunded_at, name: 'Estorno realizado' }, { date: contribution.created_at, name: 'Apoio criado' }, { date: contribution.refused_at, name: 'Apoio cancelado' }, { date: contribution.deleted_at, name: 'Apoio excluído' }, { date: contribution.chargeback_at, name: 'Chargeback' }], function (memo, item) {
        if (item.date !== null && item.date !== undefined) {
          item.originalDate = item.date;
          item.date = h.momentify(item.date, 'DD/MM/YYYY, HH:mm');
          return memo.concat(item);
        }

        return memo;
      }, []);

      return {
        orderedEvents: _.sortBy(mapEvents, 'originalDate')
      };
    },

    view: function view(ctrl) {
      return m('.w-col.w-col-4', [m('.fontweight-semibold.fontsize-smaller.lineheight-tighter.u-marginbottom-20', 'Histórico da transação'), ctrl.orderedEvents.map(function (cEvent) {
        return m('.w-row.fontsize-smallest.lineheight-looser.date-event', [m('.w-col.w-col-6', [m('.fontcolor-secondary', cEvent.date)]), m('.w-col.w-col-6', [m('div', cEvent.name)])]);
      })]);
    }
  };
})(window.m, window.c.h, window._);
'use strict';

window.c.AdminTransaction = (function (m, h) {
  return {
    view: function view(ctrl, args) {
      var contribution = args.contribution;
      return m('.w-col.w-col-4', [m('.fontweight-semibold.fontsize-smaller.lineheight-tighter.u-marginbottom-20', 'Detalhes do apoio'), m('.fontsize-smallest.lineheight-looser', ['Valor: R$' + h.formatNumber(contribution.value, 2, 3), m('br'), 'Taxa: R$' + h.formatNumber(contribution.gateway_fee, 2, 3), m('br'), 'Aguardando Confirmação: ' + (contribution.waiting_payment ? 'Sim' : 'Não'), m('br'), 'Anônimo: ' + (contribution.anonymous ? 'Sim' : 'Não'), m('br'), 'Id pagamento: ' + contribution.gateway_id, m('br'), 'Apoio: ' + contribution.contribution_id, m('br'), 'Chave: \n', m('br'), contribution.key, m('br'), 'Meio: ' + contribution.gateway, m('br'), 'Operadora: ' + (contribution.gateway_data && contribution.gateway_data.acquirer_name), m('br'), (function () {
        if (contribution.is_second_slip) {
          return [m('a.link-hidden[href="#"]', 'Boleto bancário'), ' ', m('span.badge', '2a via')];
        }
      })()])]);
    }
  };
})(window.m, window.c.h);
'use strict';

window.c.AdminUser = (function (m) {
  return {
    view: function view(ctrl, args) {
      var user = args.item;
      var userProfile = function userProfile() {
        return user.user_profile_img || '/assets/catarse_bootstrap/user.jpg';
      };
      return m('.w-row.admin-user', [m('.w-col.w-col-3.w-col-small-3.u-marginbottom-10', [m('img.user-avatar[src="' + userProfile() + '"]')]), m('.w-col.w-col-9.w-col-small-9', [m('.fontweight-semibold.fontsize-smaller.lineheight-tighter.u-marginbottom-10', [m('a.alt-link[target="_blank"][href="/users/' + user.user_id + '/edit"]', user.user_name)]), m('.fontsize-smallest', 'Usuário: ' + user.user_id), m('.fontsize-smallest.fontcolor-secondary', 'Catarse: ' + user.email), m('.fontsize-smallest.fontcolor-secondary', 'Gateway: ' + user.payer_email)])]);
    }
  };
})(window.m);
'use strict';

window.c.FilterDateRange = (function (m) {
  return {
    view: function view(ctrl, args) {
      return m('.w-col.w-col-3.w-col-small-6', [m('label.fontsize-smaller[for="' + args.index + '"]', args.label), m('.w-row', [m('.w-col.w-col-5.w-col-small-5.w-col-tiny-5', [m('input.w-input.text-field.positive[id="' + args.index + '"][type="text"]', {
        onchange: m.withAttr('value', args.first),
        value: args.first()
      })]), m('.w-col.w-col-2.w-col-small-2.w-col-tiny-2', [m('.fontsize-smaller.u-text-center.lineheight-looser', 'e')]), m('.w-col.w-col-5.w-col-small-5.w-col-tiny-5', [m('input.w-input.text-field.positive[type="text"]', {
        onchange: m.withAttr('value', args.last),
        value: args.last()
      })])])]);
    }
  };
})(window.m);
'use strict';

window.c.FilterDropdown = (function (m, _) {
  return {
    view: function view(ctrl, args) {
      return m('.w-col.w-col-3.w-col-small-6', [m('label.fontsize-smaller[for="' + args.index + '"]', args.label), m('select.w-select.text-field.positive[id="' + args.index + '"]', {
        onchange: m.withAttr('value', args.vm),
        value: args.vm()
      }, [_.map(args.options, function (data) {
        return m('option[value="' + data.value + '"]', data.option);
      })])]);
    }
  };
})(window.m, window._);
'use strict';

window.c.FilterMain = (function (m) {
  return {
    view: function view(ctrl, args) {
      return m('.w-row', [m('.w-col.w-col-10', [m('input.w-input.text-field.positive.medium[placeholder="' + args.placeholder + '"][type="text"]', { onchange: m.withAttr('value', args.vm), value: args.vm() })]), m('.w-col.w-col-2', [m('input#filter-btn.btn.btn-large.u-marginbottom-10[type="submit"][value="Buscar"]')])]);
    }
  };
})(window.m);
'use strict';

window.c.FilterNumberRange = (function (m) {
  return {
    view: function view(ctrl, args) {
      return m('.w-col.w-col-3.w-col-small-6', [m('label.fontsize-smaller[for="' + args.index + '"]', args.label), m('.w-row', [m('.w-col.w-col-5.w-col-small-5.w-col-tiny-5', [m('input.w-input.text-field.positive[id="' + args.index + '"][type="text"]', {
        onchange: m.withAttr('value', args.first),
        value: args.first()
      })]), m('.w-col.w-col-2.w-col-small-2.w-col-tiny-2', [m('.fontsize-smaller.u-text-center.lineheight-looser', 'e')]), m('.w-col.w-col-5.w-col-small-5.w-col-tiny-5', [m('input.w-input.text-field.positive[type="text"]', {
        onchange: m.withAttr('value', args.last),
        value: args.last()
      })])])]);
    }
  };
})(window.m);
'use strict';

window.c.PaymentStatus = (function (m) {
  return {
    controller: function controller(args) {
      var payment = args.item,
          card = null,
          displayPaymentMethod,
          paymentMethodClass,
          stateClass;

      card = function () {
        if (payment.gateway_data) {
          switch (payment.gateway.toLowerCase()) {
            case 'moip':
              return {
                first_digits: payment.gateway_data.cartao_bin,
                last_digits: payment.gateway_data.cartao_final,
                brand: payment.gateway_data.cartao_bandeira
              };
            case 'pagarme':
              return {
                first_digits: payment.gateway_data.card_first_digits,
                last_digits: payment.gateway_data.card_last_digits,
                brand: payment.gateway_data.card_brand
              };
          }
        }
      };

      displayPaymentMethod = function () {
        switch (payment.payment_method.toLowerCase()) {
          case 'boletobancario':
            return m('span#boleto-detail', '');
          case 'cartaodecredito':
            var cardData = card();
            if (cardData) {
              return m('#creditcard-detail.fontsize-smallest.fontcolor-secondary.lineheight-tight', [cardData.first_digits + '******' + cardData.last_digits, m('br'), cardData.brand + ' ' + payment.installments + 'x']);
            }
            return '';
        }
      };

      paymentMethodClass = function () {
        switch (payment.payment_method.toLowerCase()) {
          case 'boletobancario':
            return '.fa-barcode';
          case 'cartaodecredito':
            return '.fa-credit-card';
          default:
            return '.fa-question';
        }
      };

      stateClass = function () {
        switch (payment.state) {
          case 'paid':
            return '.text-success';
          case 'refunded':
            return '.text-refunded';
          case 'pending':
          case 'pending_refund':
            return '.text-waiting';
          default:
            return '.text-error';
        }
      };

      return {
        displayPaymentMethod: displayPaymentMethod,
        paymentMethodClass: paymentMethodClass,
        stateClass: stateClass
      };
    },

    view: function view(ctrl, args) {
      var payment = args.item;
      return m('.w-row.payment-status', [m('.fontsize-smallest.lineheight-looser.fontweight-semibold', [m('span.fa.fa-circle' + ctrl.stateClass()), ' ' + payment.state]), m('.fontsize-smallest.fontweight-semibold', [m('span.fa' + ctrl.paymentMethodClass()), ' ', m('a.link-hidden[href="#"]', payment.payment_method)]), m('.fontsize-smallest.fontcolor-secondary.lineheight-tight', [ctrl.displayPaymentMethod()])]);
    }
  };
})(window.m);
'use strict';

window.c.ProjectCard = (function (m, h, models) {
  return {

    view: function view(ctrl, args) {
      var project = args.project,
          progress = project.progress.toFixed(2),
          remainingTextObj = h.generateRemaingTime(project)(),
          link = '/' + project.permalink + (args.ref ? '?ref=' + args.ref : '');

      return m('.w-col.w-col-4', [m('.card-project.card.u-radius', [m('a.card-project-thumb[href="' + link + '"]', { style: { 'background-image': 'url(' + project.project_img + ')', 'display': 'block' } }), m('.card-project-description.alt', [m('.fontweight-semibold.u-text-center-small-only.lineheight-tight.u-marginbottom-10.fontsize-base', [m('a.link-hidden[href="' + link + '"]', project.project_name)]), m('.w-hidden-small.w-hidden-tiny.fontsize-smallest.fontcolor-secondary.u-marginbottom-20', 'por ' + project.owner_name), m('.w-hidden-small.w-hidden-tiny.fontcolor-secondary.fontsize-smaller', [m('a.link-hidden[href="' + link + '"]', project.headline)])]), m('.w-hidden-small.w-hidden-tiny.card-project-author.altt', [m('.fontsize-smallest.fontcolor-secondary', [m('span.fa.fa-map-marker.fa-1', ' '), ' ' + project.city_name + ', ' + project.state_acronym])]), m('.card-project-meter', [m('.meter', [m('.meter-fill', { style: { width: (progress > 100 ? 100 : progress) + '%' } })])]), m('.card-project-stats', [m('.w-row', [m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4', [m('.fontsize-base.fontweight-semibold', Math.ceil(project.progress) + '%')]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.u-text-center-small-only', [m('.fontsize-smaller.fontweight-semibold', 'R$ ' + h.formatNumber(project.pledged)), m('.fontsize-smallest.lineheight-tightest', 'Levantados')]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.u-text-right', [m('.fontsize-smaller.fontweight-semibold', remainingTextObj.total + ' ' + remainingTextObj.unit), m('.fontsize-smallest.lineheight-tightest', 'Restantes')])])])])]);
    }
  };
})(window.m, window.c.h, window.c.models);
'use strict';

window.c.ProjectChartContributionAmountPerDay = (function (m, Chart, _, h) {
  return {
    controller: function controller(args) {
      var resource = args.collection()[0],
          mountDataset = function mountDataset() {
        return [{
          label: 'R$ arrecadados por dia',
          fillColor: 'rgba(126,194,69,0.2)',
          strokeColor: 'rgba(126,194,69,1)',
          pointColor: 'rgba(126,194,69,1)',
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(220,220,220,1)',
          data: _.map(resource.source, function (item) {
            return item.total_amount;
          })
        }];
      },
          renderChart = function renderChart(element, isInitialized) {
        if (isInitialized) {
          return;
        }

        Object.defineProperty(element, 'offsetHeight', {
          get: function get() {
            return element.height;
          }
        });
        Object.defineProperty(element, 'offsetWidth', {
          get: function get() {
            return element.width;
          }
        });
        var ctx = element.getContext('2d');

        new Chart(ctx).Line({
          labels: _.map(resource.source, function (item) {
            return h.momentify(item.paid_at);
          }),
          datasets: mountDataset()
        });
      };

      return {
        renderChart: renderChart
      };
    },
    view: function view(ctrl) {
      return m('.card.u-radius.medium.u-marginbottom-30', [m('.fontweight-semibold.u-marginbottom-10.fontsize-large.u-text-center', 'R$ arrecadados por dia'), m('.w-row', [m('.w-col.w-col-12.overflow-auto', [m('canvas[id="chart"][width="860"][height="300"]', { config: ctrl.renderChart })])])]);
    }
  };
})(window.m, window.Chart, window._, window.c.h);
'use strict';

window.c.ProjectChartContributionTotalPerDay = (function (m, Chart, _, h) {
  return {
    controller: function controller(args) {
      var resource = args.collection()[0],
          mountDataset = function mountDataset() {
        return [{
          label: 'Apoios confirmados por dia',
          fillColor: 'rgba(126,194,69,0.2)',
          strokeColor: 'rgba(126,194,69,1)',
          pointColor: 'rgba(126,194,69,1)',
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(220,220,220,1)',
          data: _.map(resource.source, function (item) {
            return item.total;
          })
        }];
      },
          renderChart = function renderChart(element, isInitialized) {
        if (isInitialized) {
          return;
        }

        Object.defineProperty(element, 'offsetHeight', {
          get: function get() {
            return element.height;
          }
        });
        Object.defineProperty(element, 'offsetWidth', {
          get: function get() {
            return element.width;
          }
        });
        var ctx = element.getContext('2d');

        new Chart(ctx).Line({
          labels: _.map(resource.source, function (item) {
            return h.momentify(item.paid_at);
          }),
          datasets: mountDataset()
        });
      };

      return {
        renderChart: renderChart
      };
    },
    view: function view(ctrl) {
      return m('.card.u-radius.medium.u-marginbottom-30', [m('.fontweight-semibold.u-marginbottom-10.fontsize-large.u-text-center', 'Apoios confirmados por dia'), m('.w-row', [m('.w-col.w-col-12.overflow-auto', [m('canvas[id="chart"][width="860"][height="300"]', { config: ctrl.renderChart })])])]);
    }
  };
})(window.m, window.Chart, window._, window.c.h);
'use strict';

window.c.ProjectContributionsPerLocationTable = (function (m, models, h, _) {
  return {
    controller: function controller(args) {
      var vm = m.postgrest.filtersVM({ project_id: 'eq' }),
          contributionsPerLocation = m.prop([]),
          generateSort = function generateSort(field) {
        return function () {
          var collection = contributionsPerLocation(),
              resource = collection[0],
              orderedSource = _.sortBy(resource.source, field);

          if (resource.orderFilter === undefined) {
            resource.orderFilter = 'DESC';
          }

          if (resource.orderFilter === 'DESC') {
            orderedSource = orderedSource.reverse();
          }

          resource.source = orderedSource;
          resource.orderFilter = resource.orderFilter === 'DESC' ? 'ASC' : 'DESC';
          contributionsPerLocation(collection);
        };
      };

      vm.project_id(args.resourceId);

      models.projectContributionsPerLocation.getRow(vm.parameters()).then(function (data) {
        contributionsPerLocation(data);
        generateSort('total_contributed')();
      });

      return {
        contributionsPerLocation: contributionsPerLocation,
        generateSort: generateSort
      };
    },
    view: function view(ctrl) {
      return m('.project-contributions-per-location', [m('.fontweight-semibold.u-marginbottom-10.fontsize-large.u-text-center', 'Localização geográfica dos apoios'), ctrl.contributionsPerLocation().map(function (contributionLocation) {
        return m('.table-outer.u-marginbottom-60', [m('.w-row.table-row.fontweight-semibold.fontsize-smaller.header', [m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col', [m('div', 'Estado')]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col[data-ix="sort-arrows"]', [m('a.link-hidden[href="javascript:void(0);"]', { onclick: ctrl.generateSort('total_contributions') }, ['Apoios  ', m('span.fa.fa-sort')])]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col[data-ix="sort-arrows"]', [m('a.link-hidden[href="javascript:void(0);"]', { onclick: ctrl.generateSort('total_contributed') }, ['R$ apoiados ', m('span.w-hidden-small.w-hidden-tiny', '(% do total) '), ' ', m('span.fa.fa-sort')])])]), m('.table-inner.fontsize-small', [_.map(contributionLocation.source, function (source) {
          return m('.w-row.table-row', [m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col', [m('div', source.state_acronym)]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col', [m('div', source.total_contributions)]), m('.w-col.w-col-4.w-col-small-4.w-col-tiny-4.table-col', [m('div', ['R$ ', h.formatNumber(source.total_contributed, 2, 3), m('span.w-hidden-small.w-hidden-tiny', '  (' + source.total_on_percentage.toFixed(2) + '%)')])])]);
        })])]);
      })]);
    }
  };
})(window.m, window.c.models, window.c.h, window._);
'use strict';

window.c.ProjectReminderCount = (function (m) {
  return {
    view: function view(ctrl, args) {
      var project = args.resource;
      return m('#project-reminder-count.card.u-radius.u-text-center.medium.u-marginbottom-80', [m('.fontsize-large.fontweight-semibold', 'Total de pessoas que clicaram no botão Lembrar-me'), m('.fontsize-smaller.u-marginbottom-30', 'Um lembrete por email é enviado 48 horas antes do término da sua campanha'), m('.fontsize-jumbo', project.reminder_count)]);
    }
  };
})(window.m);
'use strict';

window.c.ProjectRow = (function (m) {
  return {

    view: function view(ctrl, args) {
      var collection = args.collection,
          ref = args.ref;
      return collection.collection().length > 0 ? m('.w-section.section.u-marginbottom-40', [m('.w-container', [m('.w-row.u-marginbottom-30', [m('.w-col.w-col-10.w-col-small-6.w-col-tiny-6', [m('.fontsize-large.lineheight-looser', collection.title)]), m('.w-col.w-col-2.w-col-small-6.w-col-tiny-6', [m('a.btn.btn-small.btn-terciary[href="/pt/explore?ref=' + ref + '#' + collection.hash + '"]', 'Ver todos')])]), m('.w-row', _.map(collection.collection(), function (project) {
        return m.component(c.ProjectCard, { project: project, ref: ref });
      }))])]) : m('');
    } };
})(window.m);
'use strict';

window.c.TeamMembers = (function (_, m, models) {
  return {
    controller: function controller() {
      var vm = { collection: m.prop([]) },
          groupCollection = function groupCollection(collection, groupTotal) {
        return _.map(_.range(Math.ceil(collection.length / groupTotal)), function (i) {
          return collection.slice(i * groupTotal, (i + 1) * groupTotal);
        });
      };

      models.teamMember.getPage().then(function (data) {
        vm.collection(groupCollection(data, 4));
      });

      return {
        vm: vm
      };
    },

    view: function view(ctrl) {
      return m('#team-members-static.w-section.section', [m('.w-container', [_.map(ctrl.vm.collection(), function (group) {
        return m('.w-row.u-text-center', [_.map(group, function (member) {
          return m('.team-member.w-col.w-col-3.w-col-small-3.w-col-tiny-6.u-marginbottom-40', [m('a.alt-link[href="/users/' + member.id + '"]', [m('img.thumb.big.u-round.u-marginbottom-10[src="' + member.img + '"]'), m('.fontweight-semibold.fontsize-base', member.name)]), m('.fontsize-smallest.fontcolor-secondary', 'Apoiou ' + member.total_contributed_projects + ' projetos')]);
        })]);
      })])]);
    }
  };
})(window._, window.m, window.c.models);
'use strict';

window.c.TeamTotal = (function (m, h, models) {
  return {
    controller: function controller() {
      var vm = { collection: m.prop([]) };

      models.teamTotal.getRow().then(function (data) {
        vm.collection(data);
      });

      return {
        vm: vm
      };
    },

    view: function view(ctrl) {
      return m('#team-total-static.w-section.section-one-column.u-margintop-40.u-text-center.u-marginbottom-20', [ctrl.vm.collection().map(function (teamTotal) {
        return m('.w-container', [m('.w-row', [m('.w-col.w-col-2'), m('.w-col.w-col-8', [m('.fontsize-base.u-marginbottom-30', 'Hoje somos ' + teamTotal.member_count + ' pessoas espalhadas por ' + teamTotal.total_cities + ' cidades em ' + teamTotal.countries.length + ' países (' + teamTotal.countries.toString() + ')! O Catarse é independente, sem investidores, de código aberto e construído com amor. Nossa paixão é construir um ambiente onde cada vez mais projetos possam ganhar vida.'), m('.fontsize-larger.lineheight-tight.text-success', 'Nossa equipe, junta, já apoiou R$' + h.formatNumber(teamTotal.total_amount) + ' para ' + teamTotal.total_contributed_projects + ' projetos!')]), m('.w-col.w-col-2')])]);
      })]);
    }
  };
})(window.m, window.c.h, window.c.models);
'use strict';

window.c.admin.Contributions = (function (m, c, h) {
  var admin = c.admin;
  return {
    controller: function controller() {
      var listVM = admin.contributionListVM,
          filterVM = admin.contributionFilterVM,
          error = m.prop(''),
          itemBuilder = [{
        component: 'AdminUser',
        wrapperClass: '.w-col.w-col-4'
      }, {
        component: 'AdminProject',
        wrapperClass: '.w-col.w-col-4'
      }, {
        component: 'AdminContribution',
        wrapperClass: '.w-col.w-col-2'
      }, {
        component: 'PaymentStatus',
        wrapperClass: '.w-col.w-col-2'
      }],
          itemActions = [{
        component: 'AdminInputAction',
        data: {
          property: 'user_id',
          updateKey: 'id',
          callToAction: 'Transferir',
          innerLabel: 'Id do novo apoiador:',
          outerLabel: 'Transferir Apoio',
          placeholder: 'ex: 129908',
          model: c.models.contributionDetail
        }
      }, {
        component: 'AdminRadioAction',
        data: {
          getKey: 'project_id',
          updateKey: 'contribution_id',
          property: 'reward_id',
          radios: 'rewards',
          callToAction: 'Alterar Recompensa',
          outerLabel: 'Recompensa',
          getModel: c.models.projectDetail,
          updateModel: c.models.contributionDetail
        }
      }, {
        component: 'AdminInputAction',
        data: {
          property: 'state',
          updateKey: 'id',
          callToAction: 'Apagar',
          innerLabel: 'Tem certeza que deseja apagar esse apoio?',
          outerLabel: 'Apagar Apoio',
          forceValue: 'deleted',
          model: c.models.contributionDetail
        }
      }],
          filterBuilder = [{ //full_text_index
        component: 'FilterMain',
        data: {
          vm: filterVM.full_text_index,
          placeholder: 'Busque por projeto, email, Ids do usuário e do apoio...'
        }
      }, { //state
        component: 'FilterDropdown',
        data: {
          label: 'Com o estado',
          name: 'state',
          vm: filterVM.state,
          options: [{ value: '', option: 'Qualquer um' }, { value: 'paid', option: 'paid' }, { value: 'refused', option: 'refused' }, { value: 'pending', option: 'pending' }, { value: 'pending_refund', option: 'pending_refund' }, { value: 'refunded', option: 'refunded' }, { value: 'chargeback', option: 'chargeback' }, { value: 'deleted', option: 'deleted' }]
        }
      }, { //gateway
        component: 'FilterDropdown',
        data: {
          label: 'gateway',
          name: 'gateway',
          vm: filterVM.gateway,
          options: [{ value: '', option: 'Qualquer um' }, { value: 'Pagarme', option: 'Pagarme' }, { value: 'MoIP', option: 'MoIP' }, { value: 'PayPal', option: 'PayPal' }, { value: 'Credits', option: 'Créditos' }]
        }
      }, { //value
        component: 'FilterNumberRange',
        data: {
          label: 'Valores entre',
          first: filterVM.value.gte,
          last: filterVM.value.lte
        }
      }, { //created_at
        component: 'FilterDateRange',
        data: {
          label: 'Período do apoio',
          first: filterVM.created_at.gte,
          last: filterVM.created_at.lte
        }
      }],
          submit = function submit() {
        listVM.firstPage(filterVM.parameters()).then(null, function (serverError) {
          error(serverError.message);
        });
        return false;
      };

      return {
        filterVM: filterVM,
        filterBuilder: filterBuilder,
        itemActions: itemActions,
        itemBuilder: itemBuilder,
        listVM: { list: listVM, error: error },
        submit: submit
      };
    },

    view: function view(ctrl) {
      return [m.component(c.AdminFilter, { form: ctrl.filterVM.formDescriber, filterBuilder: ctrl.filterBuilder, submit: ctrl.submit }), m.component(c.AdminList, { vm: ctrl.listVM, itemBuilder: ctrl.itemBuilder, itemActions: ctrl.itemActions })];
    }
  };
})(window.m, window.c, window.c.h);
'use strict';

window.c.contribution.ProjectsHome = (function (m, c) {
  return {
    controller: function controller() {
      var vm = {
        recommendedCollection: m.prop([]),
        recentCollection: m.prop([]),
        nearMeCollection: m.prop([]),
        expiringCollection: m.prop([])
      },
          project = c.models.project,
          expiring = m.postgrest.filtersVM({ expires_at: 'lte', state: 'eq' }),
          nearMe = m.postgrest.filtersVM({ near_me: 'eq', state: 'eq' }),
          recents = m.postgrest.filtersVM({ online_date: 'gte', state: 'eq' }),
          recommended = m.postgrest.filtersVM({ recommended: 'eq', state: 'eq' });

      expiring.expires_at(moment().add(14, 'days').format('YYYY-MM-DD'));
      expiring.state('online');

      nearMe.near_me('true').state('online');

      recents.online_date(moment().subtract(5, 'days').format('YYYY-MM-DD'));
      recents.state('online');

      recommended.recommended('true').state('online');

      project.getPageWithToken(nearMe.parameters()).then(vm.nearMeCollection);
      project.getPage(recommended.parameters()).then(vm.recommendedCollection);
      project.getPage(recents.parameters()).then(vm.recentCollection);
      project.getPage(expiring.parameters()).then(vm.expiringCollection);

      var collections = [{
        title: 'Próximos a você',
        hash: 'near_of',
        collection: vm.nearMeCollection
      }, {
        title: 'Recomendados',
        hash: 'recommended',
        collection: vm.recommendedCollection
      }, {
        title: 'Na reta final',
        hash: 'expiring',
        collection: vm.expiringCollection
      }, {
        title: 'Recentes',
        hash: 'recent',
        collection: vm.recentCollection
      }];

      return {
        collections: collections
      };
    },

    view: function view(ctrl) {
      return _.map(ctrl.collections, function (collection) {
        return m.component(c.ProjectRow, { collection: collection, ref: 'home_' + collection.hash });
      });
    }
  };
})(window.m, window.c);
'use strict';

window.c.pages.LiveStatistics = (function (m, models, h, _, JSON) {
  return {
    controller: function controller() {
      var args = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var pageStatistics = m.prop([]),
          notificationData = m.prop({});

      models.statistic.getRow().then(pageStatistics);
      // args.socket is a socket provided by socket.io
      // can see there https://github.com/catarse/catarse-live/blob/master/public/index.js#L8
      if (args.socket && _.isFunction(args.socket.on)) {
        args.socket.on('new_paid_contributions', function (msg) {
          notificationData(JSON.parse(msg.payload));
          models.statistic.getRow().then(pageStatistics);
          m.redraw();
        });
      }

      return {
        pageStatistics: pageStatistics,
        notificationData: notificationData
      };
    },
    view: function view(ctrl) {
      var data = ctrl.notificationData();

      return m('.w-section.bg-stats.section.min-height-100', [m('.w-container.u-text-center', _.map(ctrl.pageStatistics(), function (stat) {
        return [m('img.u-marginbottom-60[src="https://daks2k3a4ib2z.cloudfront.net/54b440b85608e3f4389db387/55ada5dd11b36a52616d97df_symbol-catarse.png"]'), m('.fontcolor-negative.u-marginbottom-40', [m('.fontsize-megajumbo.fontweight-semibold', 'R$ ' + h.formatNumber(stat.total_contributed, 2, 3)), m('.fontsize-large', 'Doados para projetos publicados por aqui')]), m('.fontcolor-negative.u-marginbottom-60', [m('.fontsize-megajumbo.fontweight-semibold', stat.total_contributors), m('.fontsize-large', 'Pessoas já apoiaram pelo menos 1 projeto no Catarse')])];
      })), !_.isEmpty(data) ? m('.w-container', [m('div', [m('.card.u-radius.u-marginbottom-60.medium', [m('.w-row', [m('.w-col.w-col-4', [m('.w-row', [m('.w-col.w-col-4.w-col-small-4', [m('img.thumb.u-round[src="' + data.user_image + '"]')]), m('.w-col.w-col-8.w-col-small-8', [m('.fontsize-large.lineheight-tight', data.user_name)])])]), m('.w-col.w-col-4.u-text-center.fontsize-base.u-margintop-20', [m('div', 'acabou de apoiar o')]), m('.w-col.w-col-4', [m('.w-row', [m('.w-col.w-col-4.w-col-small-4', [m('img.thumb-project.u-radius[src="' + data.project_image + '"][width="75"]')]), m('.w-col.w-col-8.w-col-small-8', [m('.fontsize-large.lineheight-tight', data.project_name)])])])])])])]) : '', m('.u-text-center.fontsize-large.u-marginbottom-10.fontcolor-negative', [m('a.link-hidden.fontcolor-negative[href="https://github.com/catarse"][target="_blank"]', [m('span.fa.fa-github', '.'), ' Open Source com orgulho! '])])]);
    }
  };
})(window.m, window.c.models, window.c.h, window._, window.JSON);
'use strict';

window.c.pages.Team = (function (m, c) {
  return {
    view: function view() {
      return m('#static-team-app', [m.component(c.TeamTotal), m.component(c.TeamMembers)]);
    }
  };
})(window.m, window.c);
'use strict';

window.c.project.Insights = (function (m, c, models, _) {
  return {
    controller: function controller(args) {
      var vm = m.postgrest.filtersVM({ project_id: 'eq' }),
          projectDetails = m.prop([]),
          contributionsPerDay = m.prop([]);

      vm.project_id(args.root.getAttribute('data-id'));

      models.projectDetail.getRow(vm.parameters()).then(projectDetails);
      models.projectContributionsPerDay.getRow(vm.parameters()).then(contributionsPerDay);

      return {
        vm: vm,
        projectDetails: projectDetails,
        contributionsPerDay: contributionsPerDay
      };
    },
    view: function view(ctrl) {
      return _.map(ctrl.projectDetails(), function (project) {
        return m('.project-insights', [m('.w-container', [m('.w-row.u-marginbottom-40', [m('.w-col.w-col-2'), m('.w-col.w-col-8.dashboard-header.u-text-center', [m('.fontweight-semibold.fontsize-larger.lineheight-looser.u-marginbottom-10', 'Minha campanha'), m.component(c.AdminProjectDetailsCard, { resource: project }), m.component(c.AdminProjectDetailsExplanation, { resource: project })]), m('.w-col.w-col-2')])]), (function (project) {
          if (project.is_published) {
            return [m('.divider'), m('.w-section.section-one-column.bg-gray.before-footer', [m('.w-container', [m('.w-row', [m('.w-col.w-col-12.u-text-center', { style: { 'min-height': '300px' } }, [m.component(c.ProjectChartContributionTotalPerDay, { collection: ctrl.contributionsPerDay })])]), m('.w-row', [m('.w-col.w-col-12.u-text-center', { style: { 'min-height': '300px' } }, [m.component(c.ProjectChartContributionAmountPerDay, { collection: ctrl.contributionsPerDay })])]), m('.w-row', [m('.w-col.w-col-12.u-text-center', [m.component(c.ProjectContributionsPerLocationTable, { resourceId: ctrl.vm.project_id() })])]), m('.w-row', [m('.w-col.w-col-12.u-text-center', [m.component(c.ProjectReminderCount, { resource: project })])])])])];
          }
        })(project)]);
      });
    }
  };
})(window.m, window.c, window.c.models, window._);
'use strict';

window.c.admin.contributionFilterVM = (function (m, h, replaceDiacritics) {
  var vm = m.postgrest.filtersVM({
    full_text_index: '@@',
    state: 'eq',
    gateway: 'eq',
    value: 'between',
    created_at: 'between'
  }),
      paramToString = function paramToString(p) {
    return (p || '').toString().trim();
  };

  // Set default values
  vm.state('');
  vm.gateway('');
  vm.order({ id: 'desc' });

  vm.created_at.lte.toFilter = function () {
    var filter = paramToString(vm.created_at.lte());
    return filter && h.momentFromString(filter).endOf('day').format('');
  };

  vm.created_at.gte.toFilter = function () {
    var filter = paramToString(vm.created_at.gte());
    return filter && h.momentFromString(filter).format();
  };

  vm.full_text_index.toFilter = function () {
    var filter = paramToString(vm.full_text_index());
    return filter && replaceDiacritics(filter) || undefined;
  };

  return vm;
})(window.m, window.c.h, window.replaceDiacritics);
"use strict";

window.c.admin.contributionListVM = (function (m, models) {
  return m.postgrest.paginationVM(models.contributionDetail.getPageWithToken);
})(window.m, window.c.models);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImMuanMiLCJoLmpzIiwibW9kZWxzLmpzIiwiYWRtaW4tY29udHJpYnV0aW9uLmpzIiwiYWRtaW4tZGV0YWlsLmpzIiwiYWRtaW4tZmlsdGVyLmpzIiwiYWRtaW4taW5wdXQtYWN0aW9uLmpzIiwiYWRtaW4taXRlbS5qcyIsImFkbWluLWxpc3QuanMiLCJhZG1pbi1wcm9qZWN0LWRldGFpbHMtY2FyZC5qcyIsImFkbWluLXByb2plY3QtZGV0YWlscy1leHBsYW5hdGlvbi5qcyIsImFkbWluLXByb2plY3QuanMiLCJhZG1pbi1yYWRpby1hY3Rpb24uanMiLCJhZG1pbi1yZXdhcmQuanMiLCJhZG1pbi10cmFuc2FjdGlvbi1oaXN0b3J5LmpzIiwiYWRtaW4tdHJhbnNhY3Rpb24uanMiLCJhZG1pbi11c2VyLmpzIiwiZmlsdGVyLWRhdGUtcmFuZ2UuanMiLCJmaWx0ZXItZHJvcGRvd24uanMiLCJmaWx0ZXItbWFpbi5qcyIsImZpbHRlci1udW1iZXItcmFuZ2UuanMiLCJwYXltZW50LXN0YXR1cy5qcyIsInByb2plY3QtY2FyZC5qcyIsInByb2plY3QtY2hhcnQtY29udHJpYnV0aW9uLWFtb3VudC1wZXItZGF5LmpzIiwicHJvamVjdC1jaGFydC1jb250cmlidXRpb24tdG90YWwtcGVyLWRheS5qcyIsInByb2plY3QtY29udHJpYnV0aW9ucy1wZXItbG9jYXRpb24tdGFibGUuanMiLCJwcm9qZWN0LXJlbWluZGVyLWNvdW50LmpzIiwicHJvamVjdC1yb3cuanMiLCJ0ZWFtLW1lbWJlcnMuanMiLCJ0ZWFtLXRvdGFsLmpzIiwiYWRtaW4vY29udHJpYnV0aW9ucy5qcyIsImNvbnRyaWJ1dGlvbi9wcm9qZWN0cy1ob21lLmpzIiwicGFnZXMvbGl2ZS1zdGF0aXN0aWNzLmpzIiwicGFnZXMvdGVhbS5qcyIsInByb2plY3QvaW5zaWdodHMuanMiLCJhZG1pbi9jb250cmlidXRpb25zL2NvbnRyaWJ1dGlvbi1maWx0ZXItdm0uanMiLCJhZG1pbi9jb250cmlidXRpb25z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QUcsWUFBVTtBQUNyQyxRQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ2hELFdBQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztHQUN0RCxDQUFDOztBQUVGLElBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxHQUFHLFlBQVU7QUFDdEMsUUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO0FBQ2pELFdBQU8sTUFBTSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQztHQUN6RCxDQUFDOztBQUVGLFNBQU8sRUFBRSxDQUFDO0NBQ1gsQ0FBQSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEFBQUMsQ0FBQzs7O0FDbENuRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBSSxDQUFBLFVBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRTtBQUN2RCxTQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0NBQzdFLENBQUEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEFBQUMsQ0FBQyIsImZpbGUiOiJjYXRhcnNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LmMgPSAoZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHtcbiAgICBtb2RlbHM6IHt9LFxuICAgIHBhZ2VzOiB7fSxcbiAgICBjb250cmlidXRpb246IHt9LFxuICAgIGFkbWluOiB7fSxcbiAgICBwcm9qZWN0OiB7fSxcbiAgICBoOiB7fVxuICB9O1xufSgpKTtcbiIsIndpbmRvdy5jLmggPSAoZnVuY3Rpb24obSwgbW9tZW50KXtcbiAgLy9EYXRlIEhlbHBlcnNcbiAgdmFyIG1vbWVudGlmeSA9IGZ1bmN0aW9uKGRhdGUsIGZvcm1hdCl7XG4gICAgZm9ybWF0ID0gZm9ybWF0IHx8ICdERC9NTS9ZWVlZJztcbiAgICByZXR1cm4gZGF0ZSA/IG1vbWVudChkYXRlKS5mb3JtYXQoZm9ybWF0KSA6ICdubyBkYXRlJztcbiAgfSxcblxuICBtb21lbnRGcm9tU3RyaW5nID0gZnVuY3Rpb24oZGF0ZSwgZm9ybWF0KXtcbiAgICB2YXIgZXVyb3BlYW4gPSBtb21lbnQoZGF0ZSwgZm9ybWF0IHx8ICdERC9NTS9ZWVlZJyk7XG4gICAgcmV0dXJuIGV1cm9wZWFuLmlzVmFsaWQoKSA/IGV1cm9wZWFuIDogbW9tZW50KGRhdGUpO1xuICB9LFxuXG4gIC8vTnVtYmVyIGZvcm1hdHRpbmcgaGVscGVyc1xuICBnZW5lcmF0ZUZvcm1hdE51bWJlciA9IGZ1bmN0aW9uKHMsIGMpe1xuICAgIHJldHVybiBmdW5jdGlvbihudW1iZXIsIG4sIHgpIHtcbiAgICAgIGlmIChudW1iZXIgPT09IG51bGwgfHwgbnVtYmVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHZhciByZSA9ICdcXFxcZCg/PShcXFxcZHsnICsgKHggfHwgMykgKyAnfSkrJyArIChuID4gMCA/ICdcXFxcRCcgOiAnJCcpICsgJyknLFxuICAgICAgICAgIG51bSA9IG51bWJlci50b0ZpeGVkKE1hdGgubWF4KDAsIH5+bikpO1xuICAgICAgcmV0dXJuIChjID8gbnVtLnJlcGxhY2UoJy4nLCBjKSA6IG51bSkucmVwbGFjZShuZXcgUmVnRXhwKHJlLCAnZycpLCAnJCYnICsgKHMgfHwgJywnKSk7XG4gICAgfTtcbiAgfSxcbiAgZm9ybWF0TnVtYmVyID0gZ2VuZXJhdGVGb3JtYXROdW1iZXIoJy4nLCAnLCcpLFxuXG4gIC8vT2JqZWN0IG1hbmlwdWxhdGlvbiBoZWxwZXJzXG4gIGdlbmVyYXRlUmVtYWluZ1RpbWUgPSBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgdmFyIHJlbWFpbmluZ1RleHRPYmogPSBtLnByb3Aoe30pLFxuICAgICAgICB0cmFuc2xhdGVkVGltZSA9IHtcbiAgICAgICAgICBkYXlzOiAnZGlhcycsXG4gICAgICAgICAgbWludXRlczogJ21pbnV0b3MnLFxuICAgICAgICAgIGhvdXJzOiAnaG9yYXMnLFxuICAgICAgICAgIHNlY29uZHM6ICdzZWd1bmRvcydcbiAgICAgICAgfTtcblxuICAgIHJlbWFpbmluZ1RleHRPYmooe1xuICAgICAgdW5pdDogdHJhbnNsYXRlZFRpbWVbcHJvamVjdC5yZW1haW5pbmdfdGltZS51bml0IHx8ICdzZWNvbmRzJ10sXG4gICAgICB0b3RhbDogcHJvamVjdC5yZW1haW5pbmdfdGltZS50b3RhbFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlbWFpbmluZ1RleHRPYmo7XG4gIH0sXG5cbiAgdG9nZ2xlUHJvcCA9IGZ1bmN0aW9uKGRlZmF1bHRTdGF0ZSwgYWx0ZXJuYXRlU3RhdGUpe1xuICAgIHZhciBwID0gbS5wcm9wKGRlZmF1bHRTdGF0ZSk7XG4gICAgcC50b2dnbGUgPSBmdW5jdGlvbigpe1xuICAgICAgcCgoKHAoKSA9PT0gYWx0ZXJuYXRlU3RhdGUpID8gZGVmYXVsdFN0YXRlIDogYWx0ZXJuYXRlU3RhdGUpKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHA7XG4gIH0sXG5cbiAgaWRWTSA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTSh7aWQ6ICdlcSd9KSxcblxuICAvL1RlbXBsYXRlc1xuICBsb2FkZXIgPSBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtKCcudS10ZXh0LWNlbnRlci51LW1hcmdpbnRvcC0zMFtzdHlsZT1cIm1hcmdpbi1ib3R0b206LTExMHB4O1wiXScsIFtcbiAgICAgIG0oJ2ltZ1thbHQ9XCJMb2FkZXJcIl1bc3JjPVwiaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL2NhdGFyc2UuZmlsZXMvbG9hZGVyLmdpZlwiXScpXG4gICAgXSk7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBtb21lbnRpZnk6IG1vbWVudGlmeSxcbiAgICBtb21lbnRGcm9tU3RyaW5nOiBtb21lbnRGcm9tU3RyaW5nLFxuICAgIGZvcm1hdE51bWJlcjogZm9ybWF0TnVtYmVyLFxuICAgIGlkVk06IGlkVk0sXG4gICAgdG9nZ2xlUHJvcDogdG9nZ2xlUHJvcCxcbiAgICBnZW5lcmF0ZVJlbWFpbmdUaW1lOiBnZW5lcmF0ZVJlbWFpbmdUaW1lLFxuICAgIGxvYWRlcjogbG9hZGVyXG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cubW9tZW50KSk7XG4iLCJ3aW5kb3cuYy5tb2RlbHMgPSAoZnVuY3Rpb24obSl7XG4gIHZhciBjb250cmlidXRpb25EZXRhaWwgPSBtLnBvc3RncmVzdC5tb2RlbCgnY29udHJpYnV0aW9uX2RldGFpbHMnKSxcblxuICBwcm9qZWN0RGV0YWlsID0gbS5wb3N0Z3Jlc3QubW9kZWwoJ3Byb2plY3RfZGV0YWlscycpLFxuICBjb250cmlidXRpb25zID0gbS5wb3N0Z3Jlc3QubW9kZWwoJ2NvbnRyaWJ1dGlvbnMnKSxcbiAgdGVhbVRvdGFsID0gbS5wb3N0Z3Jlc3QubW9kZWwoJ3RlYW1fdG90YWxzJyksXG4gIHByb2plY3RDb250cmlidXRpb25zUGVyRGF5ID0gbS5wb3N0Z3Jlc3QubW9kZWwoJ3Byb2plY3RfY29udHJpYnV0aW9uc19wZXJfZGF5JyksXG4gIHByb2plY3RDb250cmlidXRpb25zUGVyTG9jYXRpb24gPSBtLnBvc3RncmVzdC5tb2RlbCgncHJvamVjdF9jb250cmlidXRpb25zX3Blcl9sb2NhdGlvbicpLFxuICBwcm9qZWN0ID0gbS5wb3N0Z3Jlc3QubW9kZWwoJ3Byb2plY3RzJyksXG4gIHRlYW1NZW1iZXIgPSBtLnBvc3RncmVzdC5tb2RlbCgndGVhbV9tZW1iZXJzJyksXG4gIHN0YXRpc3RpYyA9IG0ucG9zdGdyZXN0Lm1vZGVsKCdzdGF0aXN0aWNzJyk7XG4gIHRlYW1NZW1iZXIucGFnZVNpemUoNDApO1xuICBwcm9qZWN0LnBhZ2VTaXplKDMpO1xuXG4gIHJldHVybiB7XG4gICAgY29udHJpYnV0aW9uRGV0YWlsOiBjb250cmlidXRpb25EZXRhaWwsXG4gICAgcHJvamVjdERldGFpbDogcHJvamVjdERldGFpbCxcbiAgICBjb250cmlidXRpb25zOiBjb250cmlidXRpb25zLFxuICAgIHRlYW1Ub3RhbDogdGVhbVRvdGFsLFxuICAgIHRlYW1NZW1iZXI6IHRlYW1NZW1iZXIsXG4gICAgcHJvamVjdDogcHJvamVjdCxcbiAgICBwcm9qZWN0Q29udHJpYnV0aW9uc1BlckRheTogcHJvamVjdENvbnRyaWJ1dGlvbnNQZXJEYXksXG4gICAgcHJvamVjdENvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbjogcHJvamVjdENvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbixcbiAgICBzdGF0aXN0aWM6IHN0YXRpc3RpY1xuICB9O1xufSh3aW5kb3cubSkpO1xuIiwid2luZG93LmMuQWRtaW5Db250cmlidXRpb24gPSAoZnVuY3Rpb24obSwgaCl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oY3RybCwgYXJncykge1xuICAgICAgdmFyIGNvbnRyaWJ1dGlvbiA9IGFyZ3MuaXRlbTtcbiAgICAgIHJldHVybiBtKCcudy1yb3cuYWRtaW4tY29udHJpYnV0aW9uJywgW1xuICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5saW5laGVpZ2h0LXRpZ2h0ZXIudS1tYXJnaW5ib3R0b20tMTAuZm9udHNpemUtc21hbGwnLCAnUiQnICsgY29udHJpYnV0aW9uLnZhbHVlKSxcbiAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeScsIGgubW9tZW50aWZ5KGNvbnRyaWJ1dGlvbi5jcmVhdGVkX2F0LCAnREQvTU0vWVlZWSBISDptbVtoXScpKSxcbiAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QnLCBbXG4gICAgICAgICAgICAnSUQgZG8gR2F0ZXdheTogJyxcbiAgICAgICAgICAgIG0oJ2EuYWx0LWxpbmtbdGFyZ2V0PVwiX2JsYW5rXCJdW2hyZWY9XCJodHRwczovL2Rhc2hib2FyZC5wYWdhci5tZS8jL3RyYW5zYWN0aW9ucy8nICsgY29udHJpYnV0aW9uLmdhdGV3YXlfaWQgKyAnXCJdJywgY29udHJpYnV0aW9uLmdhdGV3YXlfaWQpXG4gICAgICAgICAgXSlcbiAgICAgIF0pO1xuICAgIH1cbiAgfTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLmgpKTtcbiIsIndpbmRvdy5jLkFkbWluRGV0YWlsID0gKGZ1bmN0aW9uKG0sIF8sIGMpe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCl7XG4gICAgfSxcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKXtcbiAgICAgIHZhciBhY3Rpb25zID0gYXJncy5hY3Rpb25zLFxuICAgICAgICAgIGl0ZW0gPSBhcmdzLml0ZW07XG4gICAgICByZXR1cm4gbSgnI2FkbWluLWNvbnRyaWJ1dGlvbi1kZXRhaWwtYm94JywgW1xuICAgICAgICBtKCcuZGl2aWRlci51LW1hcmdpbnRvcC0yMC51LW1hcmdpbmJvdHRvbS0yMCcpLFxuICAgICAgICBtKCcudy1yb3cudS1tYXJnaW5ib3R0b20tMzAnLFxuICAgICAgICAgIF8ubWFwKGFjdGlvbnMsIGZ1bmN0aW9uKGFjdGlvbil7XG4gICAgICAgICAgICByZXR1cm4gbS5jb21wb25lbnQoY1thY3Rpb24uY29tcG9uZW50XSwge2RhdGE6IGFjdGlvbi5kYXRhLCBpdGVtOiBhcmdzLml0ZW19KTtcbiAgICAgICAgICB9KVxuICAgICAgICApLFxuICAgICAgICBtKCcudy1yb3cuY2FyZC5jYXJkLXRlcmNpYXJ5LnUtcmFkaXVzJyxbXG4gICAgICAgICAgbS5jb21wb25lbnQoYy5BZG1pblRyYW5zYWN0aW9uLCB7Y29udHJpYnV0aW9uOiBpdGVtfSksXG4gICAgICAgICAgbS5jb21wb25lbnQoYy5BZG1pblRyYW5zYWN0aW9uSGlzdG9yeSwge2NvbnRyaWJ1dGlvbjogaXRlbX0pLFxuICAgICAgICAgIG0uY29tcG9uZW50KGMuQWRtaW5SZXdhcmQsIHtjb250cmlidXRpb246IGl0ZW0sIGtleTogaXRlbS5rZXl9KVxuICAgICAgICBdKVxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93Ll8sIHdpbmRvdy5jKSk7XG4iLCJ3aW5kb3cuYy5BZG1pbkZpbHRlciA9IChmdW5jdGlvbihjLCBtLCBfLCBoKXtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9nZ2xlcjogaC50b2dnbGVQcm9wKGZhbHNlLCB0cnVlKVxuICAgICAgfTtcbiAgICB9LFxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwsIGFyZ3Mpe1xuICAgICAgdmFyIGZpbHRlckJ1aWxkZXIgPSBhcmdzLmZpbHRlckJ1aWxkZXIsXG4gICAgICAgICAgbWFpbiA9IF8uZmluZFdoZXJlKGZpbHRlckJ1aWxkZXIsIHtjb21wb25lbnQ6ICdGaWx0ZXJNYWluJ30pO1xuXG4gICAgICByZXR1cm4gbSgnI2FkbWluLWNvbnRyaWJ1dGlvbnMtZmlsdGVyLnctc2VjdGlvbi5wYWdlLWhlYWRlcicsIFtcbiAgICAgICAgbSgnLnctY29udGFpbmVyJywgW1xuICAgICAgICAgIG0oJy5mb250c2l6ZS1sYXJnZXIudS10ZXh0LWNlbnRlci51LW1hcmdpbmJvdHRvbS0zMCcsICdBcG9pb3MnKSxcbiAgICAgICAgICBtKCcudy1mb3JtJywgW1xuICAgICAgICAgICAgbSgnZm9ybScsIHtcbiAgICAgICAgICAgICAgb25zdWJtaXQ6IGFyZ3Muc3VibWl0XG4gICAgICAgICAgICB9LCBbXG4gICAgICAgICAgICAgIChfLmZpbmRXaGVyZShmaWx0ZXJCdWlsZGVyLCB7Y29tcG9uZW50OiAnRmlsdGVyTWFpbid9KSkgPyBtLmNvbXBvbmVudChjW21haW4uY29tcG9uZW50XSwgbWFpbi5kYXRhKSA6ICcnLFxuICAgICAgICAgICAgICBtKCcudS1tYXJnaW5ib3R0b20tMjAudy1yb3cnLFxuICAgICAgICAgICAgICAgIG0oJ2J1dHRvbi53LWNvbC53LWNvbC0xMi5mb250c2l6ZS1zbWFsbGVzdC5saW5rLWhpZGRlbi1saWdodFtzdHlsZT1cImJhY2tncm91bmQ6IG5vbmU7IGJvcmRlcjogbm9uZTsgb3V0bGluZTogbm9uZTsgdGV4dC1hbGlnbjogbGVmdDtcIl1bdHlwZT1cImJ1dHRvblwiXScsIHtcbiAgICAgICAgICAgICAgICAgIG9uY2xpY2s6IGN0cmwudG9nZ2xlci50b2dnbGVcbiAgICAgICAgICAgICAgICB9LCAnRmlsdHJvcyBhdmFuw6dhZG9zIMKgPicpKSwgKGN0cmwudG9nZ2xlcigpID9cbiAgICAgICAgICAgICAgICBtKCcjYWR2YW5jZWQtc2VhcmNoLnctcm93LmFkbWluLWZpbHRlcnMnLCBbXG4gICAgICAgICAgICAgICAgICBfLm1hcChmaWx0ZXJCdWlsZGVyLCBmdW5jdGlvbihmKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChmLmNvbXBvbmVudCAhPT0gJ0ZpbHRlck1haW4nKSA/IG0uY29tcG9uZW50KGNbZi5jb21wb25lbnRdLCBmLmRhdGEpIDogJyc7XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIF0pIDogJydcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKVxuICAgICAgICBdKVxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cuYywgd2luZG93Lm0sIHdpbmRvdy5fLCB3aW5kb3cuYy5oKSk7XG4iLCJ3aW5kb3cuYy5BZG1pbklucHV0QWN0aW9uID0gKGZ1bmN0aW9uKG0sIGgsIGMpe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKGFyZ3Mpe1xuICAgICAgdmFyIGJ1aWxkZXIgPSBhcmdzLmRhdGEsXG4gICAgICAgICAgY29tcGxldGUgPSBtLnByb3AoZmFsc2UpLFxuICAgICAgICAgIGVycm9yID0gbS5wcm9wKGZhbHNlKSxcbiAgICAgICAgICBmYWlsID0gbS5wcm9wKGZhbHNlKSxcbiAgICAgICAgICBkYXRhID0ge30sXG4gICAgICAgICAgaXRlbSA9IGFyZ3MuaXRlbSxcbiAgICAgICAgICBrZXkgPSBidWlsZGVyLnByb3BlcnR5LFxuICAgICAgICAgIG5ld1ZhbHVlID0gbS5wcm9wKGJ1aWxkZXIuZm9yY2VWYWx1ZSB8fCAnJyk7XG5cbiAgICAgIGguaWRWTS5pZChpdGVtW2J1aWxkZXIudXBkYXRlS2V5XSk7XG5cbiAgICAgIHZhciBsID0gbS5wb3N0Z3Jlc3QubG9hZGVyV2l0aFRva2VuKGJ1aWxkZXIubW9kZWwucGF0Y2hPcHRpb25zKGguaWRWTS5wYXJhbWV0ZXJzKCksIGRhdGEpKTtcblxuICAgICAgdmFyIHVwZGF0ZUl0ZW0gPSBmdW5jdGlvbihyZXMpe1xuICAgICAgICBfLmV4dGVuZChpdGVtLCByZXNbMF0pO1xuICAgICAgICBjb21wbGV0ZSh0cnVlKTtcbiAgICAgICAgZXJyb3IoZmFsc2UpO1xuICAgICAgfTtcblxuICAgICAgdmFyIHN1Ym1pdCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGRhdGFba2V5XSA9IG5ld1ZhbHVlKCk7XG4gICAgICAgIGwubG9hZCgpLnRoZW4odXBkYXRlSXRlbSwgZXJyb3IpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9O1xuXG4gICAgICB2YXIgdW5sb2FkID0gZnVuY3Rpb24oZWwsIGlzaW5pdCwgY29udGV4dCl7XG4gICAgICAgIGNvbnRleHQub251bmxvYWQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIGNvbXBsZXRlKGZhbHNlKTtcbiAgICAgICAgICBlcnJvcihmYWxzZSk7XG4gICAgICAgICAgbmV3VmFsdWUoYnVpbGRlci5mb3JjZVZhbHVlIHx8ICcnKTtcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBsZXRlOiBjb21wbGV0ZSxcbiAgICAgICAgZXJyb3I6IGVycm9yLFxuICAgICAgICBsOiBsLFxuICAgICAgICBuZXdWYWx1ZTogbmV3VmFsdWUsXG4gICAgICAgIHN1Ym1pdDogc3VibWl0LFxuICAgICAgICB0b2dnbGVyOiBoLnRvZ2dsZVByb3AoZmFsc2UsIHRydWUpLFxuICAgICAgICB1bmxvYWQ6IHVubG9hZFxuICAgICAgfTtcbiAgICB9LFxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwsIGFyZ3Mpe1xuICAgICAgdmFyIGRhdGEgPSBhcmdzLmRhdGEsXG4gICAgICAgICAgYnRuVmFsdWUgPSAoY3RybC5sKCkpID8gJ3BvciBmYXZvciwgYWd1YXJkZS4uLicgOiBkYXRhLmNhbGxUb0FjdGlvbjtcblxuICAgICAgcmV0dXJuIG0oJy53LWNvbC53LWNvbC0yJyxbXG4gICAgICAgIG0oJ2J1dHRvbi5idG4uYnRuLXNtYWxsLmJ0bi10ZXJjaWFyeScsIHtcbiAgICAgICAgICBvbmNsaWNrOiBjdHJsLnRvZ2dsZXIudG9nZ2xlXG4gICAgICAgIH0sIGRhdGEub3V0ZXJMYWJlbCksXG4gICAgICAgIChjdHJsLnRvZ2dsZXIoKSkgP1xuICAgICAgICAgIG0oJy5kcm9wZG93bi1saXN0LmNhcmQudS1yYWRpdXMuZHJvcGRvd24tbGlzdC1tZWRpdW0uemluZGV4LTEwJywge2NvbmZpZzogY3RybC51bmxvYWR9LFtcbiAgICAgICAgICAgIG0oJ2Zvcm0udy1mb3JtJywge1xuICAgICAgICAgICAgICBvbnN1Ym1pdDogY3RybC5zdWJtaXRcbiAgICAgICAgICAgIH0sICghY3RybC5jb21wbGV0ZSgpKSA/IFtcbiAgICAgICAgICAgICAgICAgIG0oJ2xhYmVsJywgZGF0YS5pbm5lckxhYmVsKSxcbiAgICAgICAgICAgICAgICAgICghZGF0YS5mb3JjZVZhbHVlKSA/XG4gICAgICAgICAgICAgICAgICBtKCdpbnB1dC53LWlucHV0LnRleHQtZmllbGRbdHlwZT1cInRleHRcIl1bcGxhY2Vob2xkZXI9XCInICsgZGF0YS5wbGFjZWhvbGRlciArICdcIl0nLCB7b25jaGFuZ2U6IG0ud2l0aEF0dHIoJ3ZhbHVlJywgY3RybC5uZXdWYWx1ZSksIHZhbHVlOiBjdHJsLm5ld1ZhbHVlKCl9KSA6ICcnLFxuICAgICAgICAgICAgICAgICAgbSgnaW5wdXQudy1idXR0b24uYnRuLmJ0bi1zbWFsbFt0eXBlPVwic3VibWl0XCJdW3ZhbHVlPVwiJyArIGJ0blZhbHVlICsgJ1wiXScpXG4gICAgICAgICAgICAgICAgXSA6ICghY3RybC5lcnJvcigpKSA/IFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctZm9ybS1kb25lW3N0eWxlPVwiZGlzcGxheTpibG9jaztcIl0nLCBbXG4gICAgICAgICAgICAgICAgICAgICAgbSgncCcsICdBcG9pbyB0cmFuc2ZlcmlkbyBjb20gc3VjZXNzbyEnKVxuICAgICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgICAgXSA6IFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctZm9ybS1lcnJvcltzdHlsZT1cImRpc3BsYXk6YmxvY2s7XCJdJywgW1xuICAgICAgICAgICAgICAgICAgICAgIG0oJ3AnLCAnSG91dmUgdW0gcHJvYmxlbWEgbmEgcmVxdWlzacOnw6NvLiBPIGFwb2lvIG7Do28gZm9pIHRyYW5zZmVyaWRvIScpXG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICApXG4gICAgICAgICAgXSlcbiAgICAgICAgOiAnJ1xuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93LmMuaCwgd2luZG93LmMpKTtcbiIsIndpbmRvdy5jLkFkbWluSXRlbSA9IChmdW5jdGlvbihtLCBfLCBoLCBjKXtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbihhcmdzKXtcblxuICAgICAgdmFyIGRpc3BsYXlEZXRhaWxCb3ggPSBoLnRvZ2dsZVByb3AoZmFsc2UsIHRydWUpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaXNwbGF5RGV0YWlsQm94OiBkaXNwbGF5RGV0YWlsQm94XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKSB7XG4gICAgICB2YXIgaXRlbSA9IGFyZ3MuaXRlbTtcblxuICAgICAgcmV0dXJuIG0oJy53LWNsZWFyZml4LmNhcmQudS1yYWRpdXMudS1tYXJnaW5ib3R0b20tMjAucmVzdWx0cy1hZG1pbi1pdGVtcycsW1xuICAgICAgICBtKCcudy1yb3cnLFtcbiAgICAgICAgICBfLm1hcChhcmdzLmJ1aWxkZXIsIGZ1bmN0aW9uKGRlc2Mpe1xuICAgICAgICAgICAgcmV0dXJuIG0oZGVzYy53cmFwcGVyQ2xhc3MsIFtcbiAgICAgICAgICAgICAgbS5jb21wb25lbnQoY1tkZXNjLmNvbXBvbmVudF0sIHtpdGVtOiBpdGVtLCBrZXk6IGl0ZW0ua2V5fSlcbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgIH0pXG4gICAgICAgIF0pLFxuICAgICAgICBtKCdidXR0b24udy1pbmxpbmUtYmxvY2suYXJyb3ctYWRtaW4uZmEuZmEtY2hldnJvbi1kb3duLmZvbnRjb2xvci1zZWNvbmRhcnknLCB7b25jbGljazogY3RybC5kaXNwbGF5RGV0YWlsQm94LnRvZ2dsZX0pLFxuICAgICAgICBjdHJsLmRpc3BsYXlEZXRhaWxCb3goKSA/IG0uY29tcG9uZW50KGMuQWRtaW5EZXRhaWwsIHtpdGVtOiBpdGVtLCBhY3Rpb25zOiBhcmdzLmFjdGlvbnMsIGtleTogaXRlbS5rZXl9KSA6ICcnXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuXywgd2luZG93LmMuaCwgd2luZG93LmMpKTtcbiIsIndpbmRvdy5jLkFkbWluTGlzdCA9IChmdW5jdGlvbihtLCBoLCBjKXtcbiAgdmFyIGFkbWluID0gYy5hZG1pbjtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICB2YXIgbGlzdCA9IGFyZ3Mudm0ubGlzdDtcbiAgICAgIGlmICghbGlzdC5jb2xsZWN0aW9uKCkubGVuZ3RoICYmIGxpc3QuZmlyc3RQYWdlKSB7XG4gICAgICAgIGxpc3QuZmlyc3RQYWdlKCkudGhlbihudWxsLCBmdW5jdGlvbihzZXJ2ZXJFcnJvcikge1xuICAgICAgICAgIGFyZ3Mudm0uZXJyb3Ioc2VydmVyRXJyb3IubWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKSB7XG4gICAgICB2YXIgbGlzdCA9IGFyZ3Mudm0ubGlzdCxcbiAgICAgICAgICBlcnJvciA9IGFyZ3Mudm0uZXJyb3I7XG4gICAgICByZXR1cm4gbSgnLnctc2VjdGlvbi5zZWN0aW9uJywgW1xuICAgICAgICBtKCcudy1jb250YWluZXInLFxuICAgICAgICAgIGVycm9yKCkgP1xuICAgICAgICAgICAgbSgnLmNhcmQuY2FyZC1lcnJvci51LXJhZGl1cy5mb250d2VpZ2h0LWJvbGQnLCBlcnJvcigpKSA6XG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIG0oJy53LXJvdy51LW1hcmdpbmJvdHRvbS0yMCcsIFtcbiAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtOScsIFtcbiAgICAgICAgICAgICAgICAgIG0oJy5mb250c2l6ZS1iYXNlJyxcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5pc0xvYWRpbmcoKSA/XG4gICAgICAgICAgICAgICAgICAgICAgJ0J1c2NhbmRvIGFwb2lvcy4uLicgOlxuICAgICAgICAgICAgICAgICAgICAgIFttKCdzcGFuLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCBsaXN0LnRvdGFsKCkpLCAnIGFwb2lvcyBlbmNvbnRyYWRvcyddXG4gICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICBtKCcjYWRtaW4tY29udHJpYnV0aW9ucy1saXN0LnctY29udGFpbmVyJyxbXG4gICAgICAgICAgICAgICAgbGlzdC5jb2xsZWN0aW9uKCkubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtLmNvbXBvbmVudChjLkFkbWluSXRlbSwge2J1aWxkZXI6IGFyZ3MuaXRlbUJ1aWxkZXIsIGFjdGlvbnM6IGFyZ3MuaXRlbUFjdGlvbnMsIGl0ZW06IGl0ZW0sIGtleTogaXRlbS5rZXl9KTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBtKCcudy1zZWN0aW9uLnNlY3Rpb24nLFtcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbnRhaW5lcicsW1xuICAgICAgICAgICAgICAgICAgICBtKCcudy1yb3cnLFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMi53LWNvbC1wdXNoLTUnLFtcbiAgICAgICAgICAgICAgICAgICAgICAgICFsaXN0LmlzTG9hZGluZygpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgbSgnYnV0dG9uI2xvYWQtbW9yZS5idG4uYnRuLW1lZGl1bS5idG4tdGVyY2lhcnknLCB7b25jbGljazogbGlzdC5uZXh0UGFnZX0sICdDYXJyZWdhciBtYWlzJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICBoLmxvYWRlcigpLFxuICAgICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICBdXG4gICAgICAgICApXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5oLCB3aW5kb3cuYykpO1xuIiwid2luZG93LmMuQWRtaW5Qcm9qZWN0RGV0YWlsc0NhcmQgPSAoZnVuY3Rpb24obSwgaCl7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oYXJncykge1xuICAgICAgdmFyIHByb2plY3QgPSBhcmdzLnJlc291cmNlLFxuICAgICAgICAgIGdlbmVyYXRlU3RhdHVzVGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHN0YXR1c1RleHRPYmogPSBtLnByb3Aoe30pLFxuICAgICAgICAgICAgICAgIHN0YXR1c1RleHQgPSB7XG4gICAgICAgICAgICAgICAgICBvbmxpbmU6IHtjc3NDbGFzczogJ3RleHQtc3VjY2VzcycsIHRleHQ6ICdOTyBBUid9LFxuICAgICAgICAgICAgICAgICAgc3VjY2Vzc2Z1bDoge2Nzc0NsYXNzOiAndGV4dC1zdWNjZXNzJywgdGV4dDogJ0ZJTkFOQ0lBRE8nfSxcbiAgICAgICAgICAgICAgICAgIGZhaWxlZDoge2Nzc0NsYXNzOiAndGV4dC1lcnJvcicsIHRleHQ6ICdOw4NPIEZJTkFOQ0lBRE8nfSxcbiAgICAgICAgICAgICAgICAgIHdhaXRpbmdfZnVuZHM6IHtjc3NDbGFzczogJ3RleHQtd2FpdGluZycsIHRleHQ6ICdBR1VBUkRBTkRPJ30sXG4gICAgICAgICAgICAgICAgICByZWplY3RlZDoge2Nzc0NsYXNzOiAndGV4dC1lcnJvcicsIHRleHQ6ICdSRUNVU0FETyd9LFxuICAgICAgICAgICAgICAgICAgZHJhZnQ6IHtjc3NDbGFzczogJycsIHRleHQ6ICdSQVNDVU5ITyd9LFxuICAgICAgICAgICAgICAgICAgaW5fYW5hbHlzaXM6IHtjc3NDbGFzczogJycsIHRleHQ6ICdFTSBBTsOBTElTRSd9LFxuICAgICAgICAgICAgICAgICAgYXBwcm92ZWQ6IHtjc3NDbGFzczogJ3RleHQtc3VjY2VzcycsIHRleHQ6ICdBUFJPVkFETyd9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc3RhdHVzVGV4dE9iaihzdGF0dXNUZXh0W3Byb2plY3Quc3RhdGVdKTtcblxuICAgICAgICAgICAgcmV0dXJuIHN0YXR1c1RleHRPYmo7XG4gICAgICAgICAgfTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvamVjdDogcHJvamVjdCxcbiAgICAgICAgc3RhdHVzVGV4dE9iajogZ2VuZXJhdGVTdGF0dXNUZXh0KCksXG4gICAgICAgIHJlbWFpbmluZ1RleHRPYmo6IGguZ2VuZXJhdGVSZW1haW5nVGltZShwcm9qZWN0KVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgdmlldzogZnVuY3Rpb24oY3RybCkge1xuICAgICAgdmFyIHByb2plY3QgPSBjdHJsLnByb2plY3QsXG4gICAgICAgICAgcHJvZ3Jlc3MgPSBwcm9qZWN0LnByb2dyZXNzLnRvRml4ZWQoMiksXG4gICAgICAgICAgc3RhdHVzVGV4dE9iaiA9IGN0cmwuc3RhdHVzVGV4dE9iaigpLFxuICAgICAgICAgIHJlbWFpbmluZ1RleHRPYmogPSBjdHJsLnJlbWFpbmluZ1RleHRPYmooKTtcblxuICAgICAgcmV0dXJuIG0oJy5wcm9qZWN0LWRldGFpbHMtY2FyZC5jYXJkLnUtcmFkaXVzLmNhcmQtdGVyY2lhcnkudS1tYXJnaW5ib3R0b20tMjAnLCBbXG4gICAgICAgIG0oJ2RpdicsIFtcbiAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGwuZm9udHdlaWdodC1zZW1pYm9sZCcsIFtcbiAgICAgICAgICAgIG0oJ3NwYW4uZm9udGNvbG9yLXNlY29uZGFyeScsICdTdGF0dXM6JyksJ8KgJyxtKCdzcGFuJywge2NsYXNzOiBzdGF0dXNUZXh0T2JqLmNzc0NsYXNzfSwgc3RhdHVzVGV4dE9iai50ZXh0KSwnwqAnXG4gICAgICAgICAgXSksXG4gICAgICAgICAgKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBpZiAocHJvamVjdC5pc19wdWJsaXNoZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBtKCcubWV0ZXIudS1tYXJnaW50b3AtMjAudS1tYXJnaW5ib3R0b20tMTAnLCBbXG4gICAgICAgICAgICAgICAgICBtKCcubWV0ZXItZmlsbCcsIHtzdHlsZToge3dpZHRoOiAocHJvZ3Jlc3MgPiAxMDAgPyAxMDAgOiBwcm9ncmVzcykgKyAnJSd9fSlcbiAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICBtKCcudy1yb3cnLCBbXG4gICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMy53LWNvbC1zbWFsbC0zLnctY29sLXRpbnktNicsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQuZm9udHNpemUtbGFyZ2UubGluZWhlaWdodC10aWdodCcsIHByb2dyZXNzICsgJyUnKSxcbiAgICAgICAgICAgICAgICAgICAgbSgnLmZvbnRjb2xvci1zZWNvbmRhcnkubGluZWhlaWdodC10aWdodGVyLmZvbnRzaXplLXNtYWxsLnUtbWFyZ2luYm90dG9tLTEwJywgJ2ZpbmFuY2lhZG8nKVxuICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMy53LWNvbC1zbWFsbC0zLnctY29sLXRpbnktNicsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQuZm9udHNpemUtbGFyZ2UubGluZWhlaWdodC10aWdodCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICAnUiQgJyArIGguZm9ybWF0TnVtYmVyKHByb2plY3QucGxlZGdlZCwgMiksXG4gICAgICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgICAgICBtKCcuZm9udGNvbG9yLXNlY29uZGFyeS5saW5laGVpZ2h0LXRpZ2h0ZXIuZm9udHNpemUtc21hbGwudS1tYXJnaW5ib3R0b20tMTAnLCAnbGV2YW50YWRvcycpXG4gICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0zLnctY29sLXNtYWxsLTMudy1jb2wtdGlueS02JywgW1xuICAgICAgICAgICAgICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1sYXJnZS5saW5laGVpZ2h0LXRpZ2h0JywgcHJvamVjdC50b3RhbF9jb250cmlidXRpb25zKSxcbiAgICAgICAgICAgICAgICAgICAgbSgnLmZvbnRjb2xvci1zZWNvbmRhcnkubGluZWhlaWdodC10aWdodGVyLmZvbnRzaXplLXNtYWxsJywgJ2Fwb2lvcycpXG4gICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0zLnctY29sLXNtYWxsLTMudy1jb2wtdGlueS02JywgW1xuICAgICAgICAgICAgICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1sYXJnZS5saW5laGVpZ2h0LXRpZ2h0JywgcmVtYWluaW5nVGV4dE9iai50b3RhbCksXG4gICAgICAgICAgICAgICAgICAgIG0oJy5mb250Y29sb3Itc2Vjb25kYXJ5LmxpbmVoZWlnaHQtdGlnaHRlci5mb250c2l6ZS1zbWFsbCcsIHJlbWFpbmluZ1RleHRPYmoudW5pdCArICcgcmVzdGFudGVzJylcbiAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KCkpXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5oKSk7XG5cbiIsIndpbmRvdy5jLkFkbWluUHJvamVjdERldGFpbHNFeHBsYW5hdGlvbiA9IChmdW5jdGlvbihtLCBoKXtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICB2YXIgZXhwbGFuYXRpb24gPSBmdW5jdGlvbihyZXNvdXJjZSkge1xuICAgICAgICB2YXIgc3RhdGVUZXh0ID0ge1xuICAgICAgICAgIG9ubGluZTogW1xuICAgICAgICAgICAgbSgnc3BhbicsICdWb2PDqiBwb2RlIHJlY2ViZXIgYXBvaW9zIGF0w6kgMjNoczU5bWluNTlzIGRvIGRpYSAnICsgaC5tb21lbnRpZnkocmVzb3VyY2Uuem9uZV9leHBpcmVzX2F0KSArICcuIExlbWJyZS1zZSwgw6kgdHVkby1vdS1uYWRhIGUgdm9jw6ogc8OzIGxldmFyw6Egb3MgcmVjdXJzb3MgY2FwdGFkb3Mgc2UgYmF0ZXIgYSBtZXRhIGRlbnRybyBkZXNzZSBwcmF6by4nKVxuICAgICAgICAgIF0sXG4gICAgICAgICAgc3VjY2Vzc2Z1bDogW1xuICAgICAgICAgICAgbSgnc3Bhbi5mb250d2VpZ2h0LXNlbWlib2xkJywgcmVzb3VyY2UudXNlci5uYW1lICsgJywgY29tZW1vcmUgcXVlIHZvY8OqIG1lcmVjZSEnKSxcbiAgICAgICAgICAgICcgU2V1IHByb2pldG8gZm9pIGJlbSBzdWNlZGlkbyBlIGFnb3JhIMOpIGEgaG9yYSBkZSBpbmljaWFyIG8gdHJhYmFsaG8gZGUgcmVsYWNpb25hbWVudG8gY29tIHNldXMgYXBvaWFkb3JlcyEgJyxcbiAgICAgICAgICAgICdBdGVuw6fDo28gZXNwZWNpYWwgw6AgZW50cmVnYSBkZSByZWNvbXBlbnNhcy4gUHJvbWV0ZXU/IEVudHJlZ3VlISBOw6NvIGRlaXhlIGRlIG9saGFyIGEgc2XDp8OjbyBkZSBww7NzLXByb2pldG8gZG8gJyxcbiAgICAgICAgICAgIG0oJ2EuYWx0LWxpbmtbaHJlZj1cIi9ndWlkZXNcIl0nLCAnR3VpYSBkb3MgUmVhbGl6YWRvcmVzJyksXG4gICAgICAgICAgICAnwqBlIGRlIGluZm9ybWFyLXNlIHNvYnJlwqAnLG0oJ2EuYWx0LWxpbmtbaHJlZj1cImh0dHA6Ly9zdXBvcnRlLmNhdGFyc2UubWUvaGMvcHQtYnIvYXJ0aWNsZXMvMjAyMDM3NDkzLUZJTkFOQ0lBRE8tQ29tby1zZXIlQzMlQTEtZmVpdG8tby1yZXBhc3NlLWRvLWRpbmhlaXJvLVwiXVt0YXJnZXQ9XCJfYmxhbmtcIl0nLCAnY29tbyBvIHJlcGFzc2UgZG8gZGluaGVpcm8gc2Vyw6EgZmVpdG8uJylcbiAgICAgICAgICBdLFxuICAgICAgICAgIHdhaXRpbmdfZnVuZHM6IFtcbiAgICAgICAgICAgIG0oJ3NwYW4uZm9udHdlaWdodC1zZW1pYm9sZCcsIHJlc291cmNlLnVzZXIubmFtZSArICcsIGVzdGFtb3MgcHJvY2Vzc2FuZG8gb3Mgw7psdGltb3MgcGFnYW1lbnRvcyEnKSxcbiAgICAgICAgICAgICcgU2V1IHByb2pldG8gZm9pIGZpbmFsaXphZG8gZW0gJyArIGgubW9tZW50aWZ5KHJlc291cmNlLnpvbmVfZXhwaXJlc19hdCkgKyAnIGUgZXN0w6EgYWd1YXJkYW5kbyBjb25maXJtYcOnw6NvIGRlIGJvbGV0b3MgZSBwYWdhbWVudG9zLiAnLFxuICAgICAgICAgICAgJ0RldmlkbyDDoCBkYXRhIGRlIHZlbmNpbWVudG8gZGUgYm9sZXRvcywgcHJvamV0b3MgcXVlIHRpdmVyYW0gYXBvaW9zIGRlIMO6bHRpbWEgaG9yYSBmaWNhbSBwb3IgYXTDqSA0IGRpYXMgw7p0ZWlzIG5lc3NlIHN0YXR1cywgY29udGFkb3MgYSBwYXJ0aXIgZGEgZGF0YSBkZSBmaW5hbGl6YcOnw6NvIGRvIHByb2pldG8uwqAnLFxuICAgICAgICAgICAgbSgnYS5hbHQtbGlua1tocmVmPVwiaHR0cDovL3N1cG9ydGUuY2F0YXJzZS5tZS9oYy9wdC1ici9hcnRpY2xlcy8yMDIwMzc0OTMtRklOQU5DSUFETy1Db21vLXNlciVDMyVBMS1mZWl0by1vLXJlcGFzc2UtZG8tZGluaGVpcm8tXCJdW3RhcmdldD1cIl9ibGFua1wiXScsICdFbnRlbmRhIGNvbW8gbyByZXBhc3NlIGRlIGRpbmhlaXJvIMOpIGZlaXRvIHBhcmEgcHJvamV0b3MgYmVtIHN1Y2VkaWRvcy4nKVxuICAgICAgICAgIF0sXG4gICAgICAgICAgZmFpbGVkOiBbXG4gICAgICAgICAgICBtKCdzcGFuLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCByZXNvdXJjZS51c2VyLm5hbWUgKyAnLCBuw6NvIGRlc2FuaW1lIScpLFxuICAgICAgICAgICAgJyBTZXUgcHJvamV0byBuw6NvIGJhdGV1IGEgbWV0YSBlIHNhYmVtb3MgcXVlIGlzc28gbsOjbyDDqSBhIG1lbGhvciBkYXMgc2Vuc2HDp8O1ZXMuIE1hcyBuw6NvIGRlc2FuaW1lLiAnLFxuICAgICAgICAgICAgJ0VuY2FyZSBvIHByb2Nlc3NvIGNvbW8gdW0gYXByZW5kaXphZG8gZSBuw6NvIGRlaXhlIGRlIGNvZ2l0YXIgdW1hIHNlZ3VuZGEgdGVudGF0aXZhLiBOw6NvIHNlIHByZW9jdXBlLCB0b2RvcyBvcyBzZXVzIGFwb2lhZG9yZXMgcmVjZWJlcsOjbyBvIGRpbmhlaXJvIGRlIHZvbHRhLsKgJyxcbiAgICAgICAgICAgIG0oJ2EuYWx0LWxpbmtbaHJlZj1cImh0dHA6Ly9zdXBvcnRlLmNhdGFyc2UubWUvaGMvcHQtYnIvYXJ0aWNsZXMvMjAyMzY1NTA3LVJlZ3Jhcy1lLWZ1bmNpb25hbWVudG8tZG9zLXJlZW1ib2xzb3MtZXN0b3Jub3NcIl1bdGFyZ2V0PVwiX2JsYW5rXCJdJywgJ0VudGVuZGEgY29tbyBmYXplbW9zIGVzdG9ybm9zIGUgcmVlbWJvbHNvcy4nKVxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVqZWN0ZWQ6IFtcbiAgICAgICAgICAgIG0oJ3NwYW4uZm9udHdlaWdodC1zZW1pYm9sZCcsIHJlc291cmNlLnVzZXIubmFtZSArICcsIGluZmVsaXptZW50ZSBuw6NvIGZvaSBkZXN0YSB2ZXouJyksXG4gICAgICAgICAgICAnIFZvY8OqIGVudmlvdSBzZXUgcHJvamV0byBwYXJhIGFuw6FsaXNlIGRvIENhdGFyc2UgZSBlbnRlbmRlbW9zIHF1ZSBlbGUgbsOjbyBlc3TDoSBkZSBhY29yZG8gY29tIG8gcGVyZmlsIGRvIHNpdGUuICcsXG4gICAgICAgICAgICAnVGVyIHVtIHByb2pldG8gcmVjdXNhZG8gbsOjbyBpbXBlZGUgcXVlIHZvY8OqIGVudmllIG5vdm9zIHByb2pldG9zIHBhcmEgYXZhbGlhw6fDo28gb3UgcmVmb3JtdWxlIHNldSBwcm9qZXRvIGF0dWFsLiAnLFxuICAgICAgICAgICAgJ0NvbnZlcnNlIGNvbSBub3NzbyBhdGVuZGltZW50byEgUmVjb21lbmRhbW9zIHF1ZSB2b2PDqiBkw6ogdW1hIGJvYSBvbGhhZGEgbm9zwqAnLFxuICAgICAgICAgICAgbSgnYS5hbHQtbGlua1tocmVmPVwiaHR0cDovL3N1cG9ydGUuY2F0YXJzZS5tZS9oYy9wdC1ici9hcnRpY2xlcy8yMDIzODc2MzgtRGlyZXRyaXplcy1wYXJhLWNyaWElQzMlQTclQzMlQTNvLWRlLXByb2pldG9zXCJdW3RhcmdldD1cIl9ibGFua1wiXScsICdjcml0w6lyaW9zIGRhIHBsYXRhZm9ybWEnKSxcbiAgICAgICAgICAgICfCoGUgbm/CoCcsXG4gICAgICAgICAgICBtKCdhLmFsdC1saW5rW2hyZWY9XCIvZ3VpZGVzXCJdJywgJ2d1aWEgZG9zIHJlYWxpemFkb3JlcycpLCcuJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgZHJhZnQ6IFtcbiAgICAgICAgICAgIG0oJ3NwYW4uZm9udHdlaWdodC1zZW1pYm9sZCcsIHJlc291cmNlLnVzZXIubmFtZSArICcsIGNvbnN0cnVhIG8gc2V1IHByb2pldG8hJyksXG4gICAgICAgICAgICAnwqBRdWFudG8gbWFpcyBjdWlkYWRvc28gZSBiZW0gZm9ybWF0YWRvIGZvciB1bSBwcm9qZXRvLCBtYWlvcmVzIGFzIGNoYW5jZXMgZGUgZWxlIHNlciBiZW0gc3VjZWRpZG8gbmEgc3VhIGNhbXBhbmhhIGRlIGNhcHRhw6fDo28uICcsXG4gICAgICAgICAgICAnQW50ZXMgZGUgZW52aWFyIHNldSBwcm9qZXRvIHBhcmEgYSBub3NzYSBhbsOhbGlzZSwgcHJlZW5jaGEgdG9kYXMgYXMgYWJhcyBhbyBsYWRvIGNvbSBjYXJpbmhvLiBWb2PDqiBwb2RlIHNhbHZhciBhcyBhbHRlcmHDp8O1ZXMgZSB2b2x0YXIgYW8gcmFzY3VuaG8gZGUgcHJvamV0byBxdWFudGFzIHZlemVzIHF1aXNlci4gJyxcbiAgICAgICAgICAgICdRdWFuZG8gdHVkbyBlc3RpdmVyIHByb250bywgY2xpcXVlIG5vIGJvdMOjbyBFTlZJQVIgZSBlbnRyYXJlbW9zIGVtIGNvbnRhdG8gcGFyYSBhdmFsaWFyIG8gc2V1IHByb2pldG8uJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgaW5fYW5hbHlzaXM6IFtcbiAgICAgICAgICAgIG0oJ3NwYW4uZm9udHdlaWdodC1zZW1pYm9sZCcsIHJlc291cmNlLnVzZXIubmFtZSArICcsIHZvY8OqIGVudmlvdSBzZXUgcHJvamV0byBwYXJhIGFuw6FsaXNlIGVtICcgKyBoLm1vbWVudGlmeShyZXNvdXJjZS5zZW50X3RvX2FuYWx5c2lzX2F0KSArICcgZSByZWNlYmVyw6Egbm9zc2EgYXZhbGlhw6fDo28gZW0gYXTDqSA0IGRpYXMgw7p0ZWlzIGFww7NzIG8gZW52aW8hJyksXG4gICAgICAgICAgICAnwqBFbnF1YW50byBlc3BlcmEgYSBzdWEgcmVzcG9zdGEsIHZvY8OqIHBvZGUgY29udGludWFyIGVkaXRhbmRvIG8gc2V1IHByb2pldG8uICcsXG4gICAgICAgICAgICAnUmVjb21lbmRhbW9zIHRhbWLDqW0gcXVlIHZvY8OqIHbDoSBjb2xldGFuZG8gZmVlZGJhY2sgY29tIGFzIHBlc3NvYXMgcHLDs3hpbWFzIGUgcGxhbmVqYW5kbyBjb21vIHNlcsOhIGEgc3VhIGNhbXBhbmhhLidcbiAgICAgICAgICBdLFxuICAgICAgICAgIGFwcHJvdmVkOiBbXG4gICAgICAgICAgICBtKCdzcGFuLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCByZXNvdXJjZS51c2VyLm5hbWUgKyAnLCBzZXUgcHJvamV0byBmb2kgYXByb3ZhZG8hJyksXG4gICAgICAgICAgICAnwqBQYXJhIGNvbG9jYXIgbyBzZXUgcHJvamV0byBubyBhciDDqSBwcmVjaXNvIGFwZW5hcyBxdWUgdm9jw6ogcHJlZW5jaGEgb3MgZGFkb3MgbmVjZXNzw6FyaW9zIG5hIGFiYcKgJyxcbiAgICAgICAgICAgIG0oJ2EuYWx0LWxpbmtbaHJlZj1cIiN1c2VyX3NldHRpbmdzXCJdJywgJ0NvbnRhJyksXG4gICAgICAgICAgICAnLiDDiSBpbXBvcnRhbnRlIHNhYmVyIHF1ZSBjb2JyYW1vcyBhIHRheGEgZGUgMTMlIGRvIHZhbG9yIHRvdGFsIGFycmVjYWRhZG8gYXBlbmFzIHBvciBwcm9qZXRvcyBiZW0gc3VjZWRpZG9zLiBFbnRlbmRhwqAnLFxuICAgICAgICAgICAgbSgnYS5hbHQtbGlua1tocmVmPVwiaHR0cDovL3N1cG9ydGUuY2F0YXJzZS5tZS9oYy9wdC1ici9hcnRpY2xlcy8yMDIwMzc0OTMtRklOQU5DSUFETy1Db21vLXNlciVDMyVBMS1mZWl0by1vLXJlcGFzc2UtZG8tZGluaGVpcm8tXCJdW3RhcmdldD1cIl9ibGFua1wiXScsICdjb21vIGZhemVtb3MgbyByZXBhc3NlIGRvIGRpbmhlaXJvLicpXG4gICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gc3RhdGVUZXh0W3Jlc291cmNlLnN0YXRlXTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGV4cGxhbmF0aW9uOiBleHBsYW5hdGlvbihhcmdzLnJlc291cmNlKVxuICAgICAgfTtcbiAgICB9LFxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwsIGFyZ3MpIHtcbiAgICAgIHJldHVybiBtKCdwLicgKyBhcmdzLnJlc291cmNlLnN0YXRlICsgJy1wcm9qZWN0LXRleHQuZm9udHNpemUtc21hbGwubGluZWhlaWdodC1sb29zZScsIGN0cmwuZXhwbGFuYXRpb24pO1xuICAgIH1cbiAgfTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLmgpKTtcbiIsIndpbmRvdy5jLkFkbWluUHJvamVjdCA9IChmdW5jdGlvbihtLCBoKXtcbiAgcmV0dXJuIHtcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IGFyZ3MuaXRlbTtcbiAgICAgIHJldHVybiBtKCcudy1yb3cuYWRtaW4tcHJvamVjdCcsW1xuICAgICAgICBtKCcudy1jb2wudy1jb2wtMy53LWNvbC1zbWFsbC0zLnUtbWFyZ2luYm90dG9tLTEwJyxbXG4gICAgICAgICAgbSgnaW1nLnRodW1iLXByb2plY3QudS1yYWRpdXNbc3JjPScgKyBwcm9qZWN0LnByb2plY3RfaW1nICsgJ11bd2lkdGg9NTBdJylcbiAgICAgICAgXSksXG4gICAgICAgIG0oJy53LWNvbC53LWNvbC05LnctY29sLXNtYWxsLTknLFtcbiAgICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1zbWFsbGVyLmxpbmVoZWlnaHQtdGlnaHRlci51LW1hcmdpbmJvdHRvbS0xMCcsIFtcbiAgICAgICAgICAgIG0oJ2EuYWx0LWxpbmtbdGFyZ2V0PVwiX2JsYW5rXCJdW2hyZWY9XCIvJyArIHByb2plY3QucGVybWFsaW5rICsgJ1wiXScsIHByb2plY3QucHJvamVjdF9uYW1lKVxuICAgICAgICAgIF0pLFxuICAgICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVzdC5mb250d2VpZ2h0LXNlbWlib2xkJywgcHJvamVjdC5wcm9qZWN0X3N0YXRlKSxcbiAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeScsIGgubW9tZW50aWZ5KHByb2plY3QucHJvamVjdF9vbmxpbmVfZGF0ZSkgKyAnIGEgJyArIGgubW9tZW50aWZ5KHByb2plY3QucHJvamVjdF9leHBpcmVzX2F0KSlcbiAgICAgICAgXSlcbiAgICAgIF0pO1xuICAgIH1cbiAgfTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLmgpKTtcbiIsIndpbmRvdy5jLkFkbWluUmFkaW9BY3Rpb24gPSAoZnVuY3Rpb24obSwgaCwgYyl7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oYXJncyl7XG4gICAgICB2YXIgYnVpbGRlciA9IGFyZ3MuZGF0YSxcbiAgICAgICAgICBjb21wbGV0ZSA9IG0ucHJvcChmYWxzZSksXG4gICAgICAgICAgZGF0YSA9IHt9LFxuICAgICAgICAgIC8vVE9ETzogSW1wbGVtZW50IGEgZGVzY3JpcHRvciB0byBhYnN0cmFjdCB0aGUgaW5pdGlhbCBkZXNjcmlwdGlvblxuICAgICAgICAgIGRlc2NyaXB0aW9uID0gbS5wcm9wKGFyZ3MuaXRlbS5yZXdhcmQuZGVzY3JpcHRpb24gfHwgJycpLFxuICAgICAgICAgIGVycm9yID0gbS5wcm9wKGZhbHNlKSxcbiAgICAgICAgICBmYWlsID0gbS5wcm9wKGZhbHNlKSxcbiAgICAgICAgICBpdGVtID0gYXJncy5pdGVtLFxuICAgICAgICAgIGtleSA9IGJ1aWxkZXIuZ2V0S2V5LFxuICAgICAgICAgIG5ld1ZhbHVlID0gbS5wcm9wKCcnKSxcbiAgICAgICAgICBnZXRGaWx0ZXIgPSB7fSxcbiAgICAgICAgICBzZXRGaWx0ZXIgPSB7fSxcbiAgICAgICAgICByYWRpb3MgPSBtLnByb3AoKSxcbiAgICAgICAgICBnZXRLZXkgPSBidWlsZGVyLmdldEtleSxcbiAgICAgICAgICBnZXRBdHRyID0gYnVpbGRlci5yYWRpb3MsXG4gICAgICAgICAgdXBkYXRlS2V5ID0gYnVpbGRlci51cGRhdGVLZXk7XG5cbiAgICAgIHNldEZpbHRlclt1cGRhdGVLZXldID0gJ2VxJztcbiAgICAgIHZhciBzZXRWTSA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTShzZXRGaWx0ZXIpO1xuICAgICAgc2V0Vk1bdXBkYXRlS2V5XShpdGVtW3VwZGF0ZUtleV0pO1xuXG4gICAgICBnZXRGaWx0ZXJbZ2V0S2V5XSA9ICdlcSc7XG4gICAgICB2YXIgZ2V0Vk0gPSBtLnBvc3RncmVzdC5maWx0ZXJzVk0oZ2V0RmlsdGVyKTtcbiAgICAgIGdldFZNW2dldEtleV0oaXRlbVtnZXRLZXldKTtcblxuICAgICAgdmFyIGdldExvYWRlciA9IG0ucG9zdGdyZXN0LmxvYWRlcldpdGhUb2tlbihidWlsZGVyLmdldE1vZGVsLmdldFJvd09wdGlvbnMoZ2V0Vk0ucGFyYW1ldGVycygpKSk7XG5cbiAgICAgIHZhciBzZXRMb2FkZXIgPSBtLnBvc3RncmVzdC5sb2FkZXJXaXRoVG9rZW4oYnVpbGRlci51cGRhdGVNb2RlbC5wYXRjaE9wdGlvbnMoc2V0Vk0ucGFyYW1ldGVycygpLCBkYXRhKSk7XG5cbiAgICAgIHZhciB1cGRhdGVJdGVtID0gZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIF8uZXh0ZW5kKGl0ZW0sIGRhdGFbMF0pO1xuICAgICAgICBjb21wbGV0ZSh0cnVlKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBmZXRjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGdldExvYWRlci5sb2FkKCkudGhlbihmdW5jdGlvbihpdGVtKXtcbiAgICAgICAgICByYWRpb3MoaXRlbVswXVtnZXRBdHRyXSk7XG4gICAgICAgIH0sIGVycm9yKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBzdWJtaXQgPSBmdW5jdGlvbigpe1xuICAgICAgICBpZiAobmV3VmFsdWUoKSkge1xuICAgICAgICAgIGRhdGFbYnVpbGRlci5wcm9wZXJ0eV0gPSBuZXdWYWx1ZSgpO1xuICAgICAgICAgIHNldExvYWRlci5sb2FkKCkudGhlbih1cGRhdGVJdGVtLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfTtcblxuICAgICAgdmFyIHVubG9hZCA9IGZ1bmN0aW9uKGVsLCBpc2luaXQsIGNvbnRleHQpe1xuICAgICAgICBjb250ZXh0Lm9udW5sb2FkID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBjb21wbGV0ZShmYWxzZSk7XG4gICAgICAgICAgZXJyb3IoZmFsc2UpO1xuICAgICAgICAgIG5ld1ZhbHVlKCcnKTtcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBzZXREZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKHRleHQpe1xuICAgICAgICBkZXNjcmlwdGlvbih0ZXh0KTtcbiAgICAgICAgbS5yZWRyYXcoKTtcbiAgICAgIH07XG5cbiAgICAgIGZldGNoKCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBsZXRlOiBjb21wbGV0ZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuICAgICAgICBzZXREZXNjcmlwdGlvbjogc2V0RGVzY3JpcHRpb24sXG4gICAgICAgIGVycm9yOiBlcnJvcixcbiAgICAgICAgc2V0TG9hZGVyOiBzZXRMb2FkZXIsXG4gICAgICAgIGdldExvYWRlcjogZ2V0TG9hZGVyLFxuICAgICAgICBuZXdWYWx1ZTogbmV3VmFsdWUsXG4gICAgICAgIHN1Ym1pdDogc3VibWl0LFxuICAgICAgICB0b2dnbGVyOiBoLnRvZ2dsZVByb3AoZmFsc2UsIHRydWUpLFxuICAgICAgICB1bmxvYWQ6IHVubG9hZCxcbiAgICAgICAgcmFkaW9zOiByYWRpb3NcbiAgICAgIH07XG4gICAgfSxcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKXtcbiAgICAgIHZhciBkYXRhID0gYXJncy5kYXRhLFxuICAgICAgICAgIGJ0blZhbHVlID0gKGN0cmwuc2V0TG9hZGVyKCkgfHwgY3RybC5nZXRMb2FkZXIoKSkgPyAncG9yIGZhdm9yLCBhZ3VhcmRlLi4uJyA6IGRhdGEuY2FsbFRvQWN0aW9uO1xuXG4gICAgICByZXR1cm4gbSgnLnctY29sLnctY29sLTInLFtcbiAgICAgICAgbSgnYnV0dG9uLmJ0bi5idG4tc21hbGwuYnRuLXRlcmNpYXJ5Jywge1xuICAgICAgICAgIG9uY2xpY2s6IGN0cmwudG9nZ2xlci50b2dnbGVcbiAgICAgICAgfSwgZGF0YS5vdXRlckxhYmVsKSxcbiAgICAgICAgKGN0cmwudG9nZ2xlcigpKSA/XG4gICAgICAgICAgbSgnLmRyb3Bkb3duLWxpc3QuY2FyZC51LXJhZGl1cy5kcm9wZG93bi1saXN0LW1lZGl1bS56aW5kZXgtMTAnLCB7Y29uZmlnOiBjdHJsLnVubG9hZH0sW1xuICAgICAgICAgICAgbSgnZm9ybS53LWZvcm0nLCB7XG4gICAgICAgICAgICAgIG9uc3VibWl0OiBjdHJsLnN1Ym1pdFxuICAgICAgICAgICAgfSwgKCFjdHJsLmNvbXBsZXRlKCkpID8gW1xuICAgICAgICAgICAgICAgICAgKGN0cmwucmFkaW9zKCkpID9cbiAgICAgICAgICAgICAgICAgICAgXy5tYXAoY3RybC5yYWRpb3MoKSwgZnVuY3Rpb24ocmFkaW8sIGluZGV4KXtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgc2V0ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwubmV3VmFsdWUocmFkaW8uaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5zZXREZXNjcmlwdGlvbihyYWRpby5kZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSAocmFkaW8uaWQgPT09IGFyZ3MuaXRlbS5yZXdhcmQuaWQpID8gdHJ1ZSA6IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG0oJy53LXJhZGlvJywgW1xuICAgICAgICAgICAgICAgICAgICAgICAgbSgnaW5wdXQjci0nICsgaW5kZXggKyAnLnctcmFkaW8taW5wdXRbdHlwZT1yYWRpb11bbmFtZT1cImFkbWluLXJhZGlvXCJdW3ZhbHVlPVwiJyArIHJhZGlvLmlkICsgJ1wiXScgKyAoKHNlbGVjdGVkKSA/ICdbY2hlY2tlZF0nIDogJycpLHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25jbGljazogc2V0XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG0oJ2xhYmVsLnctZm9ybS1sYWJlbFtmb3I9XCJyLScgKyBpbmRleCArICdcIl0nLCAnUiQnICsgcmFkaW8ubWluaW11bV92YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgfSkgOiBoLmxvYWRlcigpLFxuICAgICAgICAgICAgICAgICAgbSgnc3Ryb25nJywgJ0Rlc2NyacOnw6NvJyksXG4gICAgICAgICAgICAgICAgICBtKCdwJywgY3RybC5kZXNjcmlwdGlvbigpKSxcbiAgICAgICAgICAgICAgICAgIG0oJ2lucHV0LnctYnV0dG9uLmJ0bi5idG4tc21hbGxbdHlwZT1cInN1Ym1pdFwiXVt2YWx1ZT1cIicgKyBidG5WYWx1ZSArICdcIl0nKVxuICAgICAgICAgICAgICAgIF0gOiAoIWN0cmwuZXJyb3IoKSkgPyBbXG4gICAgICAgICAgICAgICAgICAgIG0oJy53LWZvcm0tZG9uZVtzdHlsZT1cImRpc3BsYXk6YmxvY2s7XCJdJywgW1xuICAgICAgICAgICAgICAgICAgICAgIG0oJ3AnLCAnUmVjb21wZW5zYSBhbHRlcmFkYSBjb20gc3VjZXNzbyEnKVxuICAgICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgICAgXSA6IFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctZm9ybS1lcnJvcltzdHlsZT1cImRpc3BsYXk6YmxvY2s7XCJdJywgW1xuICAgICAgICAgICAgICAgICAgICAgIG0oJ3AnLCAnSG91dmUgdW0gcHJvYmxlbWEgbmEgcmVxdWlzacOnw6NvLiBPIGFwb2lvIG7Do28gZm9pIHRyYW5zZmVyaWRvIScpXG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICApXG4gICAgICAgICAgXSlcbiAgICAgICAgOiAnJ1xuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93LmMuaCwgd2luZG93LmMpKTtcbiIsIndpbmRvdy5jLkFkbWluUmV3YXJkID0gKGZ1bmN0aW9uKG0sIGgsIF8pe1xuICByZXR1cm4ge1xuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwsIGFyZ3MpIHtcbiAgICAgIHZhciByZXdhcmQgPSBhcmdzLmNvbnRyaWJ1dGlvbi5yZXdhcmQgfHwge30sXG4gICAgICAgICAgYXZhaWxhYmxlID0gcGFyc2VJbnQocmV3YXJkLnBhaWRfY291bnQpICsgcGFyc2VJbnQocmV3YXJkLndhaXRpbmdfcGF5bWVudF9jb3VudCk7XG5cbiAgICAgIHJldHVybiBtKCcudy1jb2wudy1jb2wtNCcsW1xuICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1zbWFsbGVyLmxpbmVoZWlnaHQtdGlnaHRlci51LW1hcmdpbmJvdHRvbS0yMCcsICdSZWNvbXBlbnNhJyksXG4gICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVzdC5saW5laGVpZ2h0LWxvb3NlcicsIChfLmlzRW1wdHkocmV3YXJkKSkgPyAnQXBvaW8gc2VtIHJlY29tcGVuc2EuJyA6IFtcbiAgICAgICAgICAgICdJRDogJyArIHJld2FyZC5pZCxcbiAgICAgICAgICAgIG0oJ2JyJyksXG4gICAgICAgICAgICAnVmFsb3IgbcOtbmltbzogUiQnICsgaC5mb3JtYXROdW1iZXIocmV3YXJkLm1pbmltdW1fdmFsdWUsIDIsIDMpLFxuICAgICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAgIG0udHJ1c3QoJ0Rpc3BvbsOtdmVpczogJyArIGF2YWlsYWJsZSArICcgLyAnICsgKHJld2FyZC5tYXhpbXVtX2NvbnRyaWJ1dGlvbnMgfHwgJyZpbmZpbjsnKSksXG4gICAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICAgJ0FndWFyZGFuZG8gY29uZmlybWHDp8OjbzogJyArIHJld2FyZC53YWl0aW5nX3BheW1lbnRfY291bnQsXG4gICAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICAgJ0Rlc2NyacOnw6NvOiAnICsgcmV3YXJkLmRlc2NyaXB0aW9uXG4gICAgICAgICAgXVxuICAgICAgICApXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5oLCB3aW5kb3cuXykpO1xuIiwid2luZG93LmMuQWRtaW5UcmFuc2FjdGlvbkhpc3RvcnkgPSAoZnVuY3Rpb24obSwgaCwgXyl7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oYXJncykge1xuICAgICAgdmFyIGNvbnRyaWJ1dGlvbiA9IGFyZ3MuY29udHJpYnV0aW9uLFxuICAgICAgICAgIG1hcEV2ZW50cyA9IF8ucmVkdWNlKFtcbiAgICAgICAge2RhdGU6IGNvbnRyaWJ1dGlvbi5wYWlkX2F0LCBuYW1lOiAnQXBvaW8gY29uZmlybWFkbyd9LFxuICAgICAgICB7ZGF0ZTogY29udHJpYnV0aW9uLnBlbmRpbmdfcmVmdW5kX2F0LCBuYW1lOiAnUmVlbWJvbHNvIHNvbGljaXRhZG8nfSxcbiAgICAgICAge2RhdGU6IGNvbnRyaWJ1dGlvbi5yZWZ1bmRlZF9hdCwgbmFtZTogJ0VzdG9ybm8gcmVhbGl6YWRvJ30sXG4gICAgICAgIHtkYXRlOiBjb250cmlidXRpb24uY3JlYXRlZF9hdCwgbmFtZTogJ0Fwb2lvIGNyaWFkbyd9LFxuICAgICAgICB7ZGF0ZTogY29udHJpYnV0aW9uLnJlZnVzZWRfYXQsIG5hbWU6ICdBcG9pbyBjYW5jZWxhZG8nfSxcbiAgICAgICAge2RhdGU6IGNvbnRyaWJ1dGlvbi5kZWxldGVkX2F0LCBuYW1lOiAnQXBvaW8gZXhjbHXDrWRvJ30sXG4gICAgICAgIHtkYXRlOiBjb250cmlidXRpb24uY2hhcmdlYmFja19hdCwgbmFtZTogJ0NoYXJnZWJhY2snfSxcbiAgICAgIF0sIGZ1bmN0aW9uKG1lbW8sIGl0ZW0pe1xuICAgICAgICBpZiAoaXRlbS5kYXRlICE9PSBudWxsICYmIGl0ZW0uZGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaXRlbS5vcmlnaW5hbERhdGUgPSBpdGVtLmRhdGU7XG4gICAgICAgICAgaXRlbS5kYXRlID0gaC5tb21lbnRpZnkoaXRlbS5kYXRlLCAnREQvTU0vWVlZWSwgSEg6bW0nKTtcbiAgICAgICAgICByZXR1cm4gbWVtby5jb25jYXQoaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgIH0sIFtdKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3JkZXJlZEV2ZW50czogXy5zb3J0QnkobWFwRXZlbnRzLCAnb3JpZ2luYWxEYXRlJylcbiAgICAgIH07XG4gICAgfSxcblxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwpIHtcbiAgICAgIHJldHVybiBtKCcudy1jb2wudy1jb2wtNCcsW1xuICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1zbWFsbGVyLmxpbmVoZWlnaHQtdGlnaHRlci51LW1hcmdpbmJvdHRvbS0yMCcsICdIaXN0w7NyaWNvIGRhIHRyYW5zYcOnw6NvJyksXG4gICAgICAgIGN0cmwub3JkZXJlZEV2ZW50cy5tYXAoZnVuY3Rpb24oY0V2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIG0oJy53LXJvdy5mb250c2l6ZS1zbWFsbGVzdC5saW5laGVpZ2h0LWxvb3Nlci5kYXRlLWV2ZW50JyxbXG4gICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNicsW1xuICAgICAgICAgICAgICBtKCcuZm9udGNvbG9yLXNlY29uZGFyeScsIGNFdmVudC5kYXRlKVxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNicsW1xuICAgICAgICAgICAgICBtKCdkaXYnLCBjRXZlbnQubmFtZSlcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSk7XG4gICAgICAgIH0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5oLCB3aW5kb3cuXykpO1xuIiwid2luZG93LmMuQWRtaW5UcmFuc2FjdGlvbiA9IChmdW5jdGlvbihtLCBoKXtcbiAgcmV0dXJuIHtcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKSB7XG4gICAgICB2YXIgY29udHJpYnV0aW9uID0gYXJncy5jb250cmlidXRpb247XG4gICAgICByZXR1cm4gbSgnLnctY29sLnctY29sLTQnLFtcbiAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQuZm9udHNpemUtc21hbGxlci5saW5laGVpZ2h0LXRpZ2h0ZXIudS1tYXJnaW5ib3R0b20tMjAnLCAnRGV0YWxoZXMgZG8gYXBvaW8nKSxcbiAgICAgICAgbSgnLmZvbnRzaXplLXNtYWxsZXN0LmxpbmVoZWlnaHQtbG9vc2VyJyxbXG4gICAgICAgICAgJ1ZhbG9yOiBSJCcgKyBoLmZvcm1hdE51bWJlcihjb250cmlidXRpb24udmFsdWUsIDIsIDMpLFxuICAgICAgICAgIG0oJ2JyJyksXG4gICAgICAgICAgJ1RheGE6IFIkJyArIGguZm9ybWF0TnVtYmVyKGNvbnRyaWJ1dGlvbi5nYXRld2F5X2ZlZSwgMiwgMyksXG4gICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAnQWd1YXJkYW5kbyBDb25maXJtYcOnw6NvOiAnICsgKGNvbnRyaWJ1dGlvbi53YWl0aW5nX3BheW1lbnQgPyAnU2ltJyA6ICdOw6NvJyksXG4gICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAnQW7DtG5pbW86ICcgKyAoY29udHJpYnV0aW9uLmFub255bW91cyA/ICdTaW0nIDogJ07Do28nKSxcbiAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICdJZCBwYWdhbWVudG86ICcgKyBjb250cmlidXRpb24uZ2F0ZXdheV9pZCxcbiAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICdBcG9pbzogJyArIGNvbnRyaWJ1dGlvbi5jb250cmlidXRpb25faWQsXG4gICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAnQ2hhdmU6wqBcXG4nLFxuICAgICAgICAgIG0oJ2JyJyksXG4gICAgICAgICAgY29udHJpYnV0aW9uLmtleSxcbiAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgICdNZWlvOiAnICsgY29udHJpYnV0aW9uLmdhdGV3YXksXG4gICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAnT3BlcmFkb3JhOiAnICsgKGNvbnRyaWJ1dGlvbi5nYXRld2F5X2RhdGEgJiYgY29udHJpYnV0aW9uLmdhdGV3YXlfZGF0YS5hY3F1aXJlcl9uYW1lKSxcbiAgICAgICAgICBtKCdicicpLFxuICAgICAgICAgIChmdW5jdGlvbigpe1xuICAgICAgICAgICAgaWYgKGNvbnRyaWJ1dGlvbi5pc19zZWNvbmRfc2xpcCkge1xuICAgICAgICAgICAgICByZXR1cm4gW20oJ2EubGluay1oaWRkZW5baHJlZj1cIiNcIl0nLCAnQm9sZXRvIGJhbmPDoXJpbycpLCAnICcsIG0oJ3NwYW4uYmFkZ2UnLCAnMmEgdmlhJyldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0oKSksXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5oKSk7XG4iLCJ3aW5kb3cuYy5BZG1pblVzZXIgPSAoZnVuY3Rpb24obSl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oY3RybCwgYXJncykge1xuICAgICAgdmFyIHVzZXIgPSBhcmdzLml0ZW07XG4gICAgICB2YXIgdXNlclByb2ZpbGUgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdXNlci51c2VyX3Byb2ZpbGVfaW1nIHx8ICcvYXNzZXRzL2NhdGFyc2VfYm9vdHN0cmFwL3VzZXIuanBnJztcbiAgICAgIH07XG4gICAgICByZXR1cm4gbSgnLnctcm93LmFkbWluLXVzZXInLFtcbiAgICAgICAgbSgnLnctY29sLnctY29sLTMudy1jb2wtc21hbGwtMy51LW1hcmdpbmJvdHRvbS0xMCcsW1xuICAgICAgICAgIG0oJ2ltZy51c2VyLWF2YXRhcltzcmM9XCInICsgdXNlclByb2ZpbGUoKSArICdcIl0nKVxuICAgICAgICBdKSxcbiAgICAgICAgbSgnLnctY29sLnctY29sLTkudy1jb2wtc21hbGwtOScsW1xuICAgICAgICAgIG0oJy5mb250d2VpZ2h0LXNlbWlib2xkLmZvbnRzaXplLXNtYWxsZXIubGluZWhlaWdodC10aWdodGVyLnUtbWFyZ2luYm90dG9tLTEwJywgW1xuICAgICAgICAgICAgbSgnYS5hbHQtbGlua1t0YXJnZXQ9XCJfYmxhbmtcIl1baHJlZj1cIi91c2Vycy8nICsgdXNlci51c2VyX2lkICsgJy9lZGl0XCJdJywgdXNlci51c2VyX25hbWUpXG4gICAgICAgICAgXSksXG4gICAgICAgICAgbSgnLmZvbnRzaXplLXNtYWxsZXN0JywgJ1VzdcOhcmlvOiAnICsgdXNlci51c2VyX2lkKSxcbiAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeScsICdDYXRhcnNlOiAnICsgdXNlci5lbWFpbCksXG4gICAgICAgICAgbSgnLmZvbnRzaXplLXNtYWxsZXN0LmZvbnRjb2xvci1zZWNvbmRhcnknLCAnR2F0ZXdheTogJyArIHVzZXIucGF5ZXJfZW1haWwpXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tKSk7XG4iLCJ3aW5kb3cuYy5GaWx0ZXJEYXRlUmFuZ2UgPSAoZnVuY3Rpb24obSl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oY3RybCwgYXJncyl7XG4gICAgICByZXR1cm4gbSgnLnctY29sLnctY29sLTMudy1jb2wtc21hbGwtNicsIFtcbiAgICAgICAgbSgnbGFiZWwuZm9udHNpemUtc21hbGxlcltmb3I9XCInICsgYXJncy5pbmRleCArICdcIl0nLCBhcmdzLmxhYmVsKSxcbiAgICAgICAgbSgnLnctcm93JywgW1xuICAgICAgICAgIG0oJy53LWNvbC53LWNvbC01LnctY29sLXNtYWxsLTUudy1jb2wtdGlueS01JywgW1xuICAgICAgICAgICAgbSgnaW5wdXQudy1pbnB1dC50ZXh0LWZpZWxkLnBvc2l0aXZlW2lkPVwiJyArIGFyZ3MuaW5kZXggKyAnXCJdW3R5cGU9XCJ0ZXh0XCJdJywge1xuICAgICAgICAgICAgICBvbmNoYW5nZTogbS53aXRoQXR0cigndmFsdWUnLCBhcmdzLmZpcnN0KSxcbiAgICAgICAgICAgICAgdmFsdWU6IGFyZ3MuZmlyc3QoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdKSxcbiAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMi53LWNvbC1zbWFsbC0yLnctY29sLXRpbnktMicsIFtcbiAgICAgICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVyLnUtdGV4dC1jZW50ZXIubGluZWhlaWdodC1sb29zZXInLCAnZScpXG4gICAgICAgICAgXSksXG4gICAgICAgICAgbSgnLnctY29sLnctY29sLTUudy1jb2wtc21hbGwtNS53LWNvbC10aW55LTUnLCBbXG4gICAgICAgICAgICBtKCdpbnB1dC53LWlucHV0LnRleHQtZmllbGQucG9zaXRpdmVbdHlwZT1cInRleHRcIl0nLCB7XG4gICAgICAgICAgICAgIG9uY2hhbmdlOiBtLndpdGhBdHRyKCd2YWx1ZScsIGFyZ3MubGFzdCksXG4gICAgICAgICAgICAgIHZhbHVlOiBhcmdzLmxhc3QoKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdKVxuICAgICAgICBdKVxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSkpO1xuIiwid2luZG93LmMuRmlsdGVyRHJvcGRvd24gPSAoZnVuY3Rpb24obSwgXyl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oY3RybCwgYXJncyl7XG4gICAgICByZXR1cm4gbSgnLnctY29sLnctY29sLTMudy1jb2wtc21hbGwtNicsIFtcbiAgICAgICAgbSgnbGFiZWwuZm9udHNpemUtc21hbGxlcltmb3I9XCInICsgYXJncy5pbmRleCArICdcIl0nLCBhcmdzLmxhYmVsKSxcbiAgICAgICAgbSgnc2VsZWN0Lnctc2VsZWN0LnRleHQtZmllbGQucG9zaXRpdmVbaWQ9XCInICsgYXJncy5pbmRleCArICdcIl0nLCB7XG4gICAgICAgICAgb25jaGFuZ2U6IG0ud2l0aEF0dHIoJ3ZhbHVlJywgYXJncy52bSksXG4gICAgICAgICAgdmFsdWU6IGFyZ3Mudm0oKVxuICAgICAgICB9LFtcbiAgICAgICAgICBfLm1hcChhcmdzLm9wdGlvbnMsIGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICAgICAgcmV0dXJuIG0oJ29wdGlvblt2YWx1ZT1cIicgKyBkYXRhLnZhbHVlICsgJ1wiXScsIGRhdGEub3B0aW9uKTtcbiAgICAgICAgICB9KVxuICAgICAgICBdKVxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93Ll8pKTtcbiIsIndpbmRvdy5jLkZpbHRlck1haW4gPSAoZnVuY3Rpb24obSl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oY3RybCwgYXJncyl7XG4gICAgICByZXR1cm4gbSgnLnctcm93JywgW1xuICAgICAgICBtKCcudy1jb2wudy1jb2wtMTAnLCBbXG4gICAgICAgICAgbSgnaW5wdXQudy1pbnB1dC50ZXh0LWZpZWxkLnBvc2l0aXZlLm1lZGl1bVtwbGFjZWhvbGRlcj1cIicgKyBhcmdzLnBsYWNlaG9sZGVyICsgJ1wiXVt0eXBlPVwidGV4dFwiXScsIHtvbmNoYW5nZTogbS53aXRoQXR0cigndmFsdWUnLCBhcmdzLnZtKSwgdmFsdWU6IGFyZ3Mudm0oKX0pXG4gICAgICAgIF0pLFxuICAgICAgICBtKCcudy1jb2wudy1jb2wtMicsIFtcbiAgICAgICAgICBtKCdpbnB1dCNmaWx0ZXItYnRuLmJ0bi5idG4tbGFyZ2UudS1tYXJnaW5ib3R0b20tMTBbdHlwZT1cInN1Ym1pdFwiXVt2YWx1ZT1cIkJ1c2NhclwiXScpXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tKSk7XG4iLCJ3aW5kb3cuYy5GaWx0ZXJOdW1iZXJSYW5nZSA9IChmdW5jdGlvbihtKXtcbiAgcmV0dXJuIHtcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKXtcbiAgICAgIHJldHVybiBtKCcudy1jb2wudy1jb2wtMy53LWNvbC1zbWFsbC02JywgW1xuICAgICAgICBtKCdsYWJlbC5mb250c2l6ZS1zbWFsbGVyW2Zvcj1cIicgKyBhcmdzLmluZGV4ICsgJ1wiXScsIGFyZ3MubGFiZWwpLFxuICAgICAgICBtKCcudy1yb3cnLCBbXG4gICAgICAgICAgbSgnLnctY29sLnctY29sLTUudy1jb2wtc21hbGwtNS53LWNvbC10aW55LTUnLCBbXG4gICAgICAgICAgICBtKCdpbnB1dC53LWlucHV0LnRleHQtZmllbGQucG9zaXRpdmVbaWQ9XCInICsgYXJncy5pbmRleCArICdcIl1bdHlwZT1cInRleHRcIl0nLCB7XG4gICAgICAgICAgICAgIG9uY2hhbmdlOiBtLndpdGhBdHRyKCd2YWx1ZScsIGFyZ3MuZmlyc3QpLFxuICAgICAgICAgICAgICB2YWx1ZTogYXJncy5maXJzdCgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIF0pLFxuICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0yLnctY29sLXNtYWxsLTIudy1jb2wtdGlueS0yJywgW1xuICAgICAgICAgICAgbSgnLmZvbnRzaXplLXNtYWxsZXIudS10ZXh0LWNlbnRlci5saW5laGVpZ2h0LWxvb3NlcicsICdlJylcbiAgICAgICAgICBdKSxcbiAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNS53LWNvbC1zbWFsbC01LnctY29sLXRpbnktNScsIFtcbiAgICAgICAgICAgIG0oJ2lucHV0LnctaW5wdXQudGV4dC1maWVsZC5wb3NpdGl2ZVt0eXBlPVwidGV4dFwiXScsIHtcbiAgICAgICAgICAgICAgb25jaGFuZ2U6IG0ud2l0aEF0dHIoJ3ZhbHVlJywgYXJncy5sYXN0KSxcbiAgICAgICAgICAgICAgdmFsdWU6IGFyZ3MubGFzdCgpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIF0pXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tKSk7XG4iLCJ3aW5kb3cuYy5QYXltZW50U3RhdHVzID0gKGZ1bmN0aW9uKG0pe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKGFyZ3Mpe1xuICAgICAgdmFyIHBheW1lbnQgPSBhcmdzLml0ZW0sIGNhcmQgPSBudWxsLFxuICAgICAgICAgIGRpc3BsYXlQYXltZW50TWV0aG9kLCBwYXltZW50TWV0aG9kQ2xhc3MsIHN0YXRlQ2xhc3M7XG5cbiAgICAgIGNhcmQgPSBmdW5jdGlvbigpe1xuICAgICAgICBpZiAocGF5bWVudC5nYXRld2F5X2RhdGEpe1xuICAgICAgICAgIHN3aXRjaCAocGF5bWVudC5nYXRld2F5LnRvTG93ZXJDYXNlKCkpe1xuICAgICAgICAgICAgY2FzZSAnbW9pcCc6XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZmlyc3RfZGlnaXRzOiAgcGF5bWVudC5nYXRld2F5X2RhdGEuY2FydGFvX2JpbixcbiAgICAgICAgICAgICAgICBsYXN0X2RpZ2l0czogcGF5bWVudC5nYXRld2F5X2RhdGEuY2FydGFvX2ZpbmFsLFxuICAgICAgICAgICAgICAgIGJyYW5kOiBwYXltZW50LmdhdGV3YXlfZGF0YS5jYXJ0YW9fYmFuZGVpcmFcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNhc2UgJ3BhZ2FybWUnOlxuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZpcnN0X2RpZ2l0czogcGF5bWVudC5nYXRld2F5X2RhdGEuY2FyZF9maXJzdF9kaWdpdHMsXG4gICAgICAgICAgICAgICAgbGFzdF9kaWdpdHM6IHBheW1lbnQuZ2F0ZXdheV9kYXRhLmNhcmRfbGFzdF9kaWdpdHMsXG4gICAgICAgICAgICAgICAgYnJhbmQ6IHBheW1lbnQuZ2F0ZXdheV9kYXRhLmNhcmRfYnJhbmRcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGRpc3BsYXlQYXltZW50TWV0aG9kID0gZnVuY3Rpb24oKXtcbiAgICAgICAgc3dpdGNoIChwYXltZW50LnBheW1lbnRfbWV0aG9kLnRvTG93ZXJDYXNlKCkpe1xuICAgICAgICAgIGNhc2UgJ2JvbGV0b2JhbmNhcmlvJzpcbiAgICAgICAgICAgIHJldHVybiBtKCdzcGFuI2JvbGV0by1kZXRhaWwnLCAnJyk7XG4gICAgICAgICAgY2FzZSAnY2FydGFvZGVjcmVkaXRvJzpcbiAgICAgICAgICAgIHZhciBjYXJkRGF0YSA9IGNhcmQoKTtcbiAgICAgICAgICAgIGlmIChjYXJkRGF0YSl7XG4gICAgICAgICAgICAgIHJldHVybiBtKCcjY3JlZGl0Y2FyZC1kZXRhaWwuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeS5saW5laGVpZ2h0LXRpZ2h0JywgW1xuICAgICAgICAgICAgICAgIGNhcmREYXRhLmZpcnN0X2RpZ2l0cyArICcqKioqKionICsgY2FyZERhdGEubGFzdF9kaWdpdHMsXG4gICAgICAgICAgICAgICAgbSgnYnInKSxcbiAgICAgICAgICAgICAgICBjYXJkRGF0YS5icmFuZCArICcgJyArIHBheW1lbnQuaW5zdGFsbG1lbnRzICsgJ3gnXG4gICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBwYXltZW50TWV0aG9kQ2xhc3MgPSBmdW5jdGlvbigpe1xuICAgICAgICBzd2l0Y2ggKHBheW1lbnQucGF5bWVudF9tZXRob2QudG9Mb3dlckNhc2UoKSl7XG4gICAgICAgICAgY2FzZSAnYm9sZXRvYmFuY2FyaW8nOlxuICAgICAgICAgICAgcmV0dXJuICcuZmEtYmFyY29kZSc7XG4gICAgICAgICAgY2FzZSAnY2FydGFvZGVjcmVkaXRvJzpcbiAgICAgICAgICAgIHJldHVybiAnLmZhLWNyZWRpdC1jYXJkJztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuICcuZmEtcXVlc3Rpb24nO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzdGF0ZUNsYXNzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgc3dpdGNoIChwYXltZW50LnN0YXRlKXtcbiAgICAgICAgICBjYXNlICdwYWlkJzpcbiAgICAgICAgICAgIHJldHVybiAnLnRleHQtc3VjY2Vzcyc7XG4gICAgICAgICAgY2FzZSAncmVmdW5kZWQnOlxuICAgICAgICAgICAgcmV0dXJuICcudGV4dC1yZWZ1bmRlZCc7XG4gICAgICAgICAgY2FzZSAncGVuZGluZyc6XG4gICAgICAgICAgY2FzZSAncGVuZGluZ19yZWZ1bmQnOlxuICAgICAgICAgICAgcmV0dXJuICcudGV4dC13YWl0aW5nJztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuICcudGV4dC1lcnJvcic7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpc3BsYXlQYXltZW50TWV0aG9kOiBkaXNwbGF5UGF5bWVudE1ldGhvZCxcbiAgICAgICAgcGF5bWVudE1ldGhvZENsYXNzOiBwYXltZW50TWV0aG9kQ2xhc3MsXG4gICAgICAgIHN0YXRlQ2xhc3M6IHN0YXRlQ2xhc3NcbiAgICAgIH07XG4gICAgfSxcblxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwsIGFyZ3Mpe1xuICAgICAgdmFyIHBheW1lbnQgPSBhcmdzLml0ZW07XG4gICAgICByZXR1cm4gbSgnLnctcm93LnBheW1lbnQtc3RhdHVzJywgW1xuICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QubGluZWhlaWdodC1sb29zZXIuZm9udHdlaWdodC1zZW1pYm9sZCcsW1xuICAgICAgICAgIG0oJ3NwYW4uZmEuZmEtY2lyY2xlJyArIGN0cmwuc3RhdGVDbGFzcygpKSwgJ8KgJyArIHBheW1lbnQuc3RhdGVcbiAgICAgICAgXSksXG4gICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVzdC5mb250d2VpZ2h0LXNlbWlib2xkJyxbXG4gICAgICAgICAgbSgnc3Bhbi5mYScgKyBjdHJsLnBheW1lbnRNZXRob2RDbGFzcygpKSwgJyAnLCBtKCdhLmxpbmstaGlkZGVuW2hyZWY9XCIjXCJdJywgcGF5bWVudC5wYXltZW50X21ldGhvZClcbiAgICAgICAgXSksXG4gICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVzdC5mb250Y29sb3Itc2Vjb25kYXJ5LmxpbmVoZWlnaHQtdGlnaHQnLCBbXG4gICAgICAgICAgY3RybC5kaXNwbGF5UGF5bWVudE1ldGhvZCgpXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tKSk7XG4iLCJ3aW5kb3cuYy5Qcm9qZWN0Q2FyZCA9ICgobSwgaCwgbW9kZWxzKSA9PiB7XG4gIHJldHVybiB7XG5cbiAgICB2aWV3OiAoY3RybCwgYXJncykgPT4ge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGFyZ3MucHJvamVjdCxcbiAgICAgICAgICBwcm9ncmVzcyA9IHByb2plY3QucHJvZ3Jlc3MudG9GaXhlZCgyKSxcbiAgICAgICAgICByZW1haW5pbmdUZXh0T2JqID0gaC5nZW5lcmF0ZVJlbWFpbmdUaW1lKHByb2plY3QpKCksXG4gICAgICAgICAgbGluayA9ICcvJyArIHByb2plY3QucGVybWFsaW5rICsgKGFyZ3MucmVmID8gJz9yZWY9JyArIGFyZ3MucmVmIDogJycpO1xuXG4gICAgICByZXR1cm4gbSgnLnctY29sLnctY29sLTQnLCBbXG4gICAgICAgIG0oJy5jYXJkLXByb2plY3QuY2FyZC51LXJhZGl1cycsIFtcbiAgICAgICAgICBtKGBhLmNhcmQtcHJvamVjdC10aHVtYltocmVmPVwiJHtsaW5rfVwiXWAsIHtzdHlsZTogeydiYWNrZ3JvdW5kLWltYWdlJzogYHVybCgke3Byb2plY3QucHJvamVjdF9pbWd9KWAsICdkaXNwbGF5JzogJ2Jsb2NrJ319KSxcbiAgICAgICAgICBtKCcuY2FyZC1wcm9qZWN0LWRlc2NyaXB0aW9uLmFsdCcsIFtcbiAgICAgICAgICAgIG0oJy5mb250d2VpZ2h0LXNlbWlib2xkLnUtdGV4dC1jZW50ZXItc21hbGwtb25seS5saW5laGVpZ2h0LXRpZ2h0LnUtbWFyZ2luYm90dG9tLTEwLmZvbnRzaXplLWJhc2UnLCBbXG4gICAgICAgICAgICAgIG0oYGEubGluay1oaWRkZW5baHJlZj1cIiR7bGlua31cIl1gLCBwcm9qZWN0LnByb2plY3RfbmFtZSlcbiAgICAgICAgICAgIF1cbiAgICAgICAgICApLFxuICAgICAgICAgICAgbSgnLnctaGlkZGVuLXNtYWxsLnctaGlkZGVuLXRpbnkuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeS51LW1hcmdpbmJvdHRvbS0yMCcsIGBwb3IgJHtwcm9qZWN0Lm93bmVyX25hbWV9YCksXG4gICAgICAgICAgICBtKCcudy1oaWRkZW4tc21hbGwudy1oaWRkZW4tdGlueS5mb250Y29sb3Itc2Vjb25kYXJ5LmZvbnRzaXplLXNtYWxsZXInLCBbXG4gICAgICAgICAgICAgIG0oYGEubGluay1oaWRkZW5baHJlZj1cIiR7bGlua31cIl1gLCBwcm9qZWN0LmhlYWRsaW5lKVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKSxcbiAgICAgICAgICBtKCcudy1oaWRkZW4tc21hbGwudy1oaWRkZW4tdGlueS5jYXJkLXByb2plY3QtYXV0aG9yLmFsdHQnLCBbXG4gICAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeScsIFttKCdzcGFuLmZhLmZhLW1hcC1tYXJrZXIuZmEtMScsICcgJyksIGAgJHtwcm9qZWN0LmNpdHlfbmFtZX0sICR7cHJvamVjdC5zdGF0ZV9hY3JvbnltfWBdKVxuICAgICAgICAgIF0pLFxuICAgICAgICAgIG0oJy5jYXJkLXByb2plY3QtbWV0ZXInLCBbXG4gICAgICAgICAgICBtKCcubWV0ZXInLCBbXG4gICAgICAgICAgICAgIG0oJy5tZXRlci1maWxsJywge3N0eWxlOiB7d2lkdGg6IGAkeyhwcm9ncmVzcyA+IDEwMCA/IDEwMCA6IHByb2dyZXNzKX0lYH19KVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKSxcbiAgICAgICAgICBtKCcuY2FyZC1wcm9qZWN0LXN0YXRzJywgW1xuICAgICAgICAgICAgbSgnLnctcm93JywgW1xuICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNC53LWNvbC1zbWFsbC00LnctY29sLXRpbnktNCcsIFtcbiAgICAgICAgICAgICAgICBtKCcuZm9udHNpemUtYmFzZS5mb250d2VpZ2h0LXNlbWlib2xkJywgYCR7TWF0aC5jZWlsKHByb2plY3QucHJvZ3Jlc3MpfSVgKVxuICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTQudy1jb2wtc21hbGwtNC53LWNvbC10aW55LTQudS10ZXh0LWNlbnRlci1zbWFsbC1vbmx5JywgW1xuICAgICAgICAgICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVyLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCBgUiQgJHtoLmZvcm1hdE51bWJlcihwcm9qZWN0LnBsZWRnZWQpfWApLFxuICAgICAgICAgICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVzdC5saW5laGVpZ2h0LXRpZ2h0ZXN0JywgJ0xldmFudGFkb3MnKVxuICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTQudy1jb2wtc21hbGwtNC53LWNvbC10aW55LTQudS10ZXh0LXJpZ2h0JywgW1xuICAgICAgICAgICAgICAgIG0oJy5mb250c2l6ZS1zbWFsbGVyLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCBgJHtyZW1haW5pbmdUZXh0T2JqLnRvdGFsfSAke3JlbWFpbmluZ1RleHRPYmoudW5pdH1gKSxcbiAgICAgICAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QubGluZWhlaWdodC10aWdodGVzdCcsICdSZXN0YW50ZXMnKVxuICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKVxuICAgICAgICBdKVxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93LmMuaCwgd2luZG93LmMubW9kZWxzKSk7XG5cbiIsIndpbmRvdy5jLlByb2plY3RDaGFydENvbnRyaWJ1dGlvbkFtb3VudFBlckRheSA9IChmdW5jdGlvbihtLCBDaGFydCwgXywgaCl7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oYXJncykge1xuICAgICAgdmFyIHJlc291cmNlID0gYXJncy5jb2xsZWN0aW9uKClbMF0sXG4gICAgICAgICAgbW91bnREYXRhc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgbGFiZWw6ICdSJCBhcnJlY2FkYWRvcyBwb3IgZGlhJyxcbiAgICAgICAgICAgICAgZmlsbENvbG9yOiAncmdiYSgxMjYsMTk0LDY5LDAuMiknLFxuICAgICAgICAgICAgICBzdHJva2VDb2xvcjogJ3JnYmEoMTI2LDE5NCw2OSwxKScsXG4gICAgICAgICAgICAgIHBvaW50Q29sb3I6ICdyZ2JhKDEyNiwxOTQsNjksMSknLFxuICAgICAgICAgICAgICBwb2ludFN0cm9rZUNvbG9yOiAnI2ZmZicsXG4gICAgICAgICAgICAgIHBvaW50SGlnaGxpZ2h0RmlsbDogJyNmZmYnLFxuICAgICAgICAgICAgICBwb2ludEhpZ2hsaWdodFN0cm9rZTogJ3JnYmEoMjIwLDIyMCwyMjAsMSknLFxuICAgICAgICAgICAgICBkYXRhOiBfLm1hcChyZXNvdXJjZS5zb3VyY2UsIGZ1bmN0aW9uKGl0ZW0pIHtyZXR1cm4gaXRlbS50b3RhbF9hbW91bnQ7fSlcbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgcmVuZGVyQ2hhcnQgPSBmdW5jdGlvbihlbGVtZW50LCBpc0luaXRpYWxpemVkKXtcbiAgICAgICAgICAgIGlmIChpc0luaXRpYWxpemVkKXtyZXR1cm47fVxuXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ29mZnNldEhlaWdodCcsIHtcbiAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGVsZW1lbnQuaGVpZ2h0OyB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ29mZnNldFdpZHRoJywge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZWxlbWVudC53aWR0aDsgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIGN0eCA9IGVsZW1lbnQuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAgICAgICAgICAgbmV3IENoYXJ0KGN0eCkuTGluZSh7XG4gICAgICAgICAgICAgIGxhYmVsczogXy5tYXAocmVzb3VyY2Uuc291cmNlLCBmdW5jdGlvbihpdGVtKSB7cmV0dXJuIGgubW9tZW50aWZ5KGl0ZW0ucGFpZF9hdCk7fSksXG4gICAgICAgICAgICAgIGRhdGFzZXRzOiBtb3VudERhdGFzZXQoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVuZGVyQ2hhcnQ6IHJlbmRlckNoYXJ0XG4gICAgICB9O1xuICAgIH0sXG4gICAgdmlldzogZnVuY3Rpb24oY3RybCkge1xuICAgICAgcmV0dXJuIG0oJy5jYXJkLnUtcmFkaXVzLm1lZGl1bS51LW1hcmdpbmJvdHRvbS0zMCcsIFtcbiAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQudS1tYXJnaW5ib3R0b20tMTAuZm9udHNpemUtbGFyZ2UudS10ZXh0LWNlbnRlcicsICdSJCBhcnJlY2FkYWRvcyBwb3IgZGlhJyksXG4gICAgICAgIG0oJy53LXJvdycsW1xuICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0xMi5vdmVyZmxvdy1hdXRvJywgW1xuICAgICAgICAgICAgbSgnY2FudmFzW2lkPVwiY2hhcnRcIl1bd2lkdGg9XCI4NjBcIl1baGVpZ2h0PVwiMzAwXCJdJywge2NvbmZpZzogY3RybC5yZW5kZXJDaGFydH0pXG4gICAgICAgICAgXSksXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuQ2hhcnQsIHdpbmRvdy5fLCB3aW5kb3cuYy5oKSk7XG5cbiIsIndpbmRvdy5jLlByb2plY3RDaGFydENvbnRyaWJ1dGlvblRvdGFsUGVyRGF5ID0gKGZ1bmN0aW9uKG0sIENoYXJ0LCBfLCBoKXtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICB2YXIgcmVzb3VyY2UgPSBhcmdzLmNvbGxlY3Rpb24oKVswXSxcbiAgICAgICAgICBtb3VudERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICBsYWJlbDogJ0Fwb2lvcyBjb25maXJtYWRvcyBwb3IgZGlhJyxcbiAgICAgICAgICAgICAgZmlsbENvbG9yOiAncmdiYSgxMjYsMTk0LDY5LDAuMiknLFxuICAgICAgICAgICAgICBzdHJva2VDb2xvcjogJ3JnYmEoMTI2LDE5NCw2OSwxKScsXG4gICAgICAgICAgICAgIHBvaW50Q29sb3I6ICdyZ2JhKDEyNiwxOTQsNjksMSknLFxuICAgICAgICAgICAgICBwb2ludFN0cm9rZUNvbG9yOiAnI2ZmZicsXG4gICAgICAgICAgICAgIHBvaW50SGlnaGxpZ2h0RmlsbDogJyNmZmYnLFxuICAgICAgICAgICAgICBwb2ludEhpZ2hsaWdodFN0cm9rZTogJ3JnYmEoMjIwLDIyMCwyMjAsMSknLFxuICAgICAgICAgICAgICBkYXRhOiBfLm1hcChyZXNvdXJjZS5zb3VyY2UsIGZ1bmN0aW9uKGl0ZW0pIHtyZXR1cm4gaXRlbS50b3RhbDt9KVxuICAgICAgICAgICAgfV07XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW5kZXJDaGFydCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGlzSW5pdGlhbGl6ZWQpe1xuICAgICAgICAgICAgaWYgKGlzSW5pdGlhbGl6ZWQpe3JldHVybjt9XG5cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnb2Zmc2V0SGVpZ2h0Jywge1xuICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZWxlbWVudC5oZWlnaHQ7IH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnb2Zmc2V0V2lkdGgnLCB7XG4gICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBlbGVtZW50LndpZHRoOyB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgY3R4ID0gZWxlbWVudC5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgICAgICBuZXcgQ2hhcnQoY3R4KS5MaW5lKHtcbiAgICAgICAgICAgICAgbGFiZWxzOiBfLm1hcChyZXNvdXJjZS5zb3VyY2UsIGZ1bmN0aW9uKGl0ZW0pIHtyZXR1cm4gaC5tb21lbnRpZnkoaXRlbS5wYWlkX2F0KTt9KSxcbiAgICAgICAgICAgICAgZGF0YXNldHM6IG1vdW50RGF0YXNldCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW5kZXJDaGFydDogcmVuZGVyQ2hhcnRcbiAgICAgIH07XG4gICAgfSxcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsKSB7XG4gICAgICByZXR1cm4gbSgnLmNhcmQudS1yYWRpdXMubWVkaXVtLnUtbWFyZ2luYm90dG9tLTMwJywgW1xuICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC51LW1hcmdpbmJvdHRvbS0xMC5mb250c2l6ZS1sYXJnZS51LXRleHQtY2VudGVyJywgJ0Fwb2lvcyBjb25maXJtYWRvcyBwb3IgZGlhJyksXG4gICAgICAgIG0oJy53LXJvdycsW1xuICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0xMi5vdmVyZmxvdy1hdXRvJywgW1xuICAgICAgICAgICAgbSgnY2FudmFzW2lkPVwiY2hhcnRcIl1bd2lkdGg9XCI4NjBcIl1baGVpZ2h0PVwiMzAwXCJdJywge2NvbmZpZzogY3RybC5yZW5kZXJDaGFydH0pXG4gICAgICAgICAgXSksXG4gICAgICAgIF0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuQ2hhcnQsIHdpbmRvdy5fLCB3aW5kb3cuYy5oKSk7XG4iLCJ3aW5kb3cuYy5Qcm9qZWN0Q29udHJpYnV0aW9uc1BlckxvY2F0aW9uVGFibGUgPSAoZnVuY3Rpb24obSwgbW9kZWxzLCBoLCBfKSB7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogZnVuY3Rpb24oYXJncykge1xuICAgICAgdmFyXHR2bSA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTSh7cHJvamVjdF9pZDogJ2VxJ30pLFxuICAgICAgICAgIGNvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbiA9IG0ucHJvcChbXSksXG4gICAgICAgICAgZ2VuZXJhdGVTb3J0ID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICB2YXIgY29sbGVjdGlvbiA9IGNvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbigpLFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2UgPSBjb2xsZWN0aW9uWzBdLFxuICAgICAgICAgICAgICAgICAgb3JkZXJlZFNvdXJjZSA9IF8uc29ydEJ5KHJlc291cmNlLnNvdXJjZSwgZmllbGQpO1xuXG4gICAgICAgICAgICAgIGlmIChyZXNvdXJjZS5vcmRlckZpbHRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb3VyY2Uub3JkZXJGaWx0ZXIgPSAnREVTQyc7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAocmVzb3VyY2Uub3JkZXJGaWx0ZXIgPT09ICdERVNDJykge1xuICAgICAgICAgICAgICAgIG9yZGVyZWRTb3VyY2UgPSBvcmRlcmVkU291cmNlLnJldmVyc2UoKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJlc291cmNlLnNvdXJjZSA9IG9yZGVyZWRTb3VyY2U7XG4gICAgICAgICAgICAgIHJlc291cmNlLm9yZGVyRmlsdGVyID0gKHJlc291cmNlLm9yZGVyRmlsdGVyID09PSAnREVTQycgPyAnQVNDJyA6ICdERVNDJyk7XG4gICAgICAgICAgICAgIGNvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbihjb2xsZWN0aW9uKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfTtcblxuICAgICAgdm0ucHJvamVjdF9pZChhcmdzLnJlc291cmNlSWQpO1xuXG4gICAgICBtb2RlbHMucHJvamVjdENvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbi5nZXRSb3codm0ucGFyYW1ldGVycygpKS50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICBjb250cmlidXRpb25zUGVyTG9jYXRpb24oZGF0YSk7XG4gICAgICAgIGdlbmVyYXRlU29ydCgndG90YWxfY29udHJpYnV0ZWQnKSgpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRyaWJ1dGlvbnNQZXJMb2NhdGlvbjogY29udHJpYnV0aW9uc1BlckxvY2F0aW9uLFxuICAgICAgICBnZW5lcmF0ZVNvcnQ6IGdlbmVyYXRlU29ydFxuICAgICAgfTtcbiAgICB9LFxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwpIHtcbiAgICAgIHJldHVybiBtKCcucHJvamVjdC1jb250cmlidXRpb25zLXBlci1sb2NhdGlvbicsIFtcbiAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQudS1tYXJnaW5ib3R0b20tMTAuZm9udHNpemUtbGFyZ2UudS10ZXh0LWNlbnRlcicsICdMb2NhbGl6YcOnw6NvIGdlb2dyw6FmaWNhIGRvcyBhcG9pb3MnKSxcbiAgICAgICAgY3RybC5jb250cmlidXRpb25zUGVyTG9jYXRpb24oKS5tYXAoZnVuY3Rpb24oY29udHJpYnV0aW9uTG9jYXRpb24pe1xuICAgICAgICAgIHJldHVybiBtKCcudGFibGUtb3V0ZXIudS1tYXJnaW5ib3R0b20tNjAnLCBbXG4gICAgICAgICAgICBtKCcudy1yb3cudGFibGUtcm93LmZvbnR3ZWlnaHQtc2VtaWJvbGQuZm9udHNpemUtc21hbGxlci5oZWFkZXInLCBbXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbCcsIFtcbiAgICAgICAgICAgICAgICBtKCdkaXYnLCAnRXN0YWRvJylcbiAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbFtkYXRhLWl4PVwic29ydC1hcnJvd3NcIl0nLCBbXG4gICAgICAgICAgICAgICAgbSgnYS5saW5rLWhpZGRlbltocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiXScsIHtvbmNsaWNrOiBjdHJsLmdlbmVyYXRlU29ydCgndG90YWxfY29udHJpYnV0aW9ucycpfSwgW1xuICAgICAgICAgICAgICAgICAgJ0Fwb2lvc8KgwqAnLG0oJ3NwYW4uZmEuZmEtc29ydCcpXG4gICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbFtkYXRhLWl4PVwic29ydC1hcnJvd3NcIl0nLCBbXG4gICAgICAgICAgICAgICAgbSgnYS5saW5rLWhpZGRlbltocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiXScsIHtvbmNsaWNrOiBjdHJsLmdlbmVyYXRlU29ydCgndG90YWxfY29udHJpYnV0ZWQnKX0sIFtcbiAgICAgICAgICAgICAgICAgICdSJCBhcG9pYWRvcyAnLFxuICAgICAgICAgICAgICAgICAgbSgnc3Bhbi53LWhpZGRlbi1zbWFsbC53LWhpZGRlbi10aW55JywnKCUgZG8gdG90YWwpwqAnKSxcbiAgICAgICAgICAgICAgICAgICcgJyxtKCdzcGFuLmZhLmZhLXNvcnQnKVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICBdKSxcbiAgICAgICAgICAgIG0oJy50YWJsZS1pbm5lci5mb250c2l6ZS1zbWFsbCcsIFtcbiAgICAgICAgICAgICAgXy5tYXAoY29udHJpYnV0aW9uTG9jYXRpb24uc291cmNlLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbSgnLnctcm93LnRhYmxlLXJvdycsIFtcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbCcsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnZGl2Jywgc291cmNlLnN0YXRlX2Fjcm9ueW0pXG4gICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbCcsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnZGl2Jywgc291cmNlLnRvdGFsX2NvbnRyaWJ1dGlvbnMpXG4gICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnctY29sLXNtYWxsLTQudy1jb2wtdGlueS00LnRhYmxlLWNvbCcsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnZGl2JywgW1xuICAgICAgICAgICAgICAgICAgICAgICdSJCAnLFxuICAgICAgICAgICAgICAgICAgICAgIGguZm9ybWF0TnVtYmVyKHNvdXJjZS50b3RhbF9jb250cmlidXRlZCwgMiwgMyksXG4gICAgICAgICAgICAgICAgICAgICAgbSgnc3Bhbi53LWhpZGRlbi1zbWFsbC53LWhpZGRlbi10aW55JywgJ8KgwqAoJyArIHNvdXJjZS50b3RhbF9vbl9wZXJjZW50YWdlLnRvRml4ZWQoMikgKyAnJSknKVxuICAgICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSk7XG4gICAgICAgIH0pXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYy5tb2RlbHMsIHdpbmRvdy5jLmgsIHdpbmRvdy5fKSk7XG4iLCJ3aW5kb3cuYy5Qcm9qZWN0UmVtaW5kZXJDb3VudCA9IChmdW5jdGlvbihtKXtcbiAgcmV0dXJuIHtcbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsLCBhcmdzKSB7XG4gICAgICB2YXIgcHJvamVjdCA9IGFyZ3MucmVzb3VyY2U7XG4gICAgICByZXR1cm4gbSgnI3Byb2plY3QtcmVtaW5kZXItY291bnQuY2FyZC51LXJhZGl1cy51LXRleHQtY2VudGVyLm1lZGl1bS51LW1hcmdpbmJvdHRvbS04MCcsIFtcbiAgICAgICAgbSgnLmZvbnRzaXplLWxhcmdlLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCAnVG90YWwgZGUgcGVzc29hcyBxdWUgY2xpY2FyYW0gbm8gYm90w6NvIExlbWJyYXItbWUnKSxcbiAgICAgICAgbSgnLmZvbnRzaXplLXNtYWxsZXIudS1tYXJnaW5ib3R0b20tMzAnLCAnVW0gbGVtYnJldGUgcG9yIGVtYWlsIMOpIGVudmlhZG8gNDggaG9yYXMgYW50ZXMgZG8gdMOpcm1pbm8gZGEgc3VhIGNhbXBhbmhhJyksXG4gICAgICAgIG0oJy5mb250c2l6ZS1qdW1ibycsIHByb2plY3QucmVtaW5kZXJfY291bnQpXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tKSk7XG4iLCJ3aW5kb3cuYy5Qcm9qZWN0Um93ID0gKChtKSA9PiB7XG4gIHJldHVybiB7XG5cbiAgICB2aWV3OiAoY3RybCwgYXJncykgPT4ge1xuICAgICAgY29uc3QgY29sbGVjdGlvbiA9IGFyZ3MuY29sbGVjdGlvbixcbiAgICAgICAgICByZWYgPSBhcmdzLnJlZjtcbiAgICAgIHJldHVybiBjb2xsZWN0aW9uLmNvbGxlY3Rpb24oKS5sZW5ndGggPiAwID8gbSgnLnctc2VjdGlvbi5zZWN0aW9uLnUtbWFyZ2luYm90dG9tLTQwJywgW1xuICAgICAgICBtKCcudy1jb250YWluZXInLCBbXG4gICAgICAgICAgbSgnLnctcm93LnUtbWFyZ2luYm90dG9tLTMwJywgW1xuICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTEwLnctY29sLXNtYWxsLTYudy1jb2wtdGlueS02JywgW1xuICAgICAgICAgICAgICBtKCcuZm9udHNpemUtbGFyZ2UubGluZWhlaWdodC1sb29zZXInLCBjb2xsZWN0aW9uLnRpdGxlKVxuICAgICAgICAgICAgXSksXG4gICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMi53LWNvbC1zbWFsbC02LnctY29sLXRpbnktNicsIFtcbiAgICAgICAgICAgICAgbShgYS5idG4uYnRuLXNtYWxsLmJ0bi10ZXJjaWFyeVtocmVmPVwiL3B0L2V4cGxvcmU/cmVmPSR7cmVmfSMke2NvbGxlY3Rpb24uaGFzaH1cIl1gLCAnVmVyIHRvZG9zJylcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSksXG4gICAgICAgICAgbSgnLnctcm93JywgXy5tYXAoY29sbGVjdGlvbi5jb2xsZWN0aW9uKCksIChwcm9qZWN0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbS5jb21wb25lbnQoYy5Qcm9qZWN0Q2FyZCwge3Byb2plY3Q6IHByb2plY3QsIHJlZjogcmVmfSk7XG4gICAgICAgICAgfSkpXG4gICAgICAgIF0pXG4gICAgICBdKSA6IG0oJycpO1xuICAgIH19O1xufSh3aW5kb3cubSkpO1xuXG4iLCJ3aW5kb3cuYy5UZWFtTWVtYmVycyA9IChmdW5jdGlvbihfLCBtLCBtb2RlbHMpe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHZtID0ge2NvbGxlY3Rpb246IG0ucHJvcChbXSl9LFxuXG4gICAgICAgIGdyb3VwQ29sbGVjdGlvbiA9IGZ1bmN0aW9uKGNvbGxlY3Rpb24sIGdyb3VwVG90YWwpIHtcbiAgICAgICAgcmV0dXJuIF8ubWFwKF8ucmFuZ2UoTWF0aC5jZWlsKGNvbGxlY3Rpb24ubGVuZ3RoIC8gZ3JvdXBUb3RhbCkpLCBmdW5jdGlvbihpKXtcbiAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5zbGljZShpICogZ3JvdXBUb3RhbCwgKGkgKyAxKSAqIGdyb3VwVG90YWwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIG1vZGVscy50ZWFtTWVtYmVyLmdldFBhZ2UoKS50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICB2bS5jb2xsZWN0aW9uKGdyb3VwQ29sbGVjdGlvbihkYXRhLCA0KSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdm06IHZtXG4gICAgICB9O1xuICAgIH0sXG5cbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsKSB7XG4gICAgICByZXR1cm4gbSgnI3RlYW0tbWVtYmVycy1zdGF0aWMudy1zZWN0aW9uLnNlY3Rpb24nLCBbXG4gICAgICAgIG0oJy53LWNvbnRhaW5lcicsW1xuICAgICAgICAgIF8ubWFwKGN0cmwudm0uY29sbGVjdGlvbigpLCBmdW5jdGlvbihncm91cCkge1xuICAgICAgICAgICAgcmV0dXJuIG0oJy53LXJvdy51LXRleHQtY2VudGVyJyxbXG4gICAgICAgICAgICAgIF8ubWFwKGdyb3VwLCBmdW5jdGlvbihtZW1iZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbSgnLnRlYW0tbWVtYmVyLnctY29sLnctY29sLTMudy1jb2wtc21hbGwtMy53LWNvbC10aW55LTYudS1tYXJnaW5ib3R0b20tNDAnLCBbXG4gICAgICAgICAgICAgICAgICBtKCdhLmFsdC1saW5rW2hyZWY9XCIvdXNlcnMvJyArIG1lbWJlci5pZCArICdcIl0nLCBbXG4gICAgICAgICAgICAgICAgICAgIG0oJ2ltZy50aHVtYi5iaWcudS1yb3VuZC51LW1hcmdpbmJvdHRvbS0xMFtzcmM9XCInICsgbWVtYmVyLmltZyArICdcIl0nKSxcbiAgICAgICAgICAgICAgICAgICAgbSgnLmZvbnR3ZWlnaHQtc2VtaWJvbGQuZm9udHNpemUtYmFzZScsIG1lbWJlci5uYW1lKVxuICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICBtKCcuZm9udHNpemUtc21hbGxlc3QuZm9udGNvbG9yLXNlY29uZGFyeScsICdBcG9pb3UgJyArIG1lbWJlci50b3RhbF9jb250cmlidXRlZF9wcm9qZWN0cyArICcgcHJvamV0b3MnKVxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgXSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgXSlcbiAgICAgIF0pO1xuICAgIH1cbiAgfTtcbn0od2luZG93Ll8sIHdpbmRvdy5tLCB3aW5kb3cuYy5tb2RlbHMpKTtcbiIsIndpbmRvdy5jLlRlYW1Ub3RhbCA9IChmdW5jdGlvbihtLCBoLCBtb2RlbHMpe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHZtID0ge2NvbGxlY3Rpb246IG0ucHJvcChbXSl9O1xuXG4gICAgICBtb2RlbHMudGVhbVRvdGFsLmdldFJvdygpLnRoZW4oZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHZtLmNvbGxlY3Rpb24oZGF0YSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdm06IHZtXG4gICAgICB9O1xuICAgIH0sXG5cbiAgICB2aWV3OiBmdW5jdGlvbihjdHJsKSB7XG4gICAgICByZXR1cm4gbSgnI3RlYW0tdG90YWwtc3RhdGljLnctc2VjdGlvbi5zZWN0aW9uLW9uZS1jb2x1bW4udS1tYXJnaW50b3AtNDAudS10ZXh0LWNlbnRlci51LW1hcmdpbmJvdHRvbS0yMCcsIFtcbiAgICAgICAgY3RybC52bS5jb2xsZWN0aW9uKCkubWFwKGZ1bmN0aW9uKHRlYW1Ub3RhbCl7XG4gICAgICAgICAgcmV0dXJuIG0oJy53LWNvbnRhaW5lcicsIFtcbiAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTInKSxcbiAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTgnLCBbXG4gICAgICAgICAgICAgICAgbSgnLmZvbnRzaXplLWJhc2UudS1tYXJnaW5ib3R0b20tMzAnLFxuICAgICAgICAgICAgICAgICAgJ0hvamUgc29tb3MgJyArIHRlYW1Ub3RhbC5tZW1iZXJfY291bnQgKyAnIHBlc3NvYXMgZXNwYWxoYWRhcyBwb3IgJyArIHRlYW1Ub3RhbC50b3RhbF9jaXRpZXMgKyAnIGNpZGFkZXMgZW0gJyArIHRlYW1Ub3RhbC5jb3VudHJpZXMubGVuZ3RoICtcbiAgICAgICAgICAgICAgICAgICAgJyBwYcOtc2VzICgnICsgdGVhbVRvdGFsLmNvdW50cmllcy50b1N0cmluZygpICsgJykhIE8gQ2F0YXJzZSDDqSBpbmRlcGVuZGVudGUsIHNlbSBpbnZlc3RpZG9yZXMsIGRlIGPDs2RpZ28gYWJlcnRvIGUgY29uc3RydcOtZG8gY29tIGFtb3IuIE5vc3NhIHBhaXjDo28gw6kgY29uc3RydWlyIHVtIGFtYmllbnRlIG9uZGUgY2FkYSB2ZXogbWFpcyBwcm9qZXRvcyBwb3NzYW0gZ2FuaGFyIHZpZGEuJyksXG4gICAgICAgICAgICAgICAgICBtKCcuZm9udHNpemUtbGFyZ2VyLmxpbmVoZWlnaHQtdGlnaHQudGV4dC1zdWNjZXNzJyxcbiAgICAgICAgICAgICAgICAgICAgJ05vc3NhIGVxdWlwZSwganVudGEsIGrDoSBhcG9pb3UgUiQnICsgaC5mb3JtYXROdW1iZXIodGVhbVRvdGFsLnRvdGFsX2Ftb3VudCkgKyAnIHBhcmEgJyArIHRlYW1Ub3RhbC50b3RhbF9jb250cmlidXRlZF9wcm9qZWN0cyArICcgcHJvamV0b3MhJyldKSxcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTInKVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKTtcbiAgICAgICAgfSlcbiAgICAgIF0pO1xuICAgIH1cbiAgfTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLmgsIHdpbmRvdy5jLm1vZGVscykpO1xuIiwid2luZG93LmMuYWRtaW4uQ29udHJpYnV0aW9ucyA9IChmdW5jdGlvbihtLCBjLCBoKXtcbiAgdmFyIGFkbWluID0gYy5hZG1pbjtcbiAgcmV0dXJuIHtcbiAgICBjb250cm9sbGVyOiBmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpc3RWTSA9IGFkbWluLmNvbnRyaWJ1dGlvbkxpc3RWTSxcbiAgICAgICAgICBmaWx0ZXJWTSA9IGFkbWluLmNvbnRyaWJ1dGlvbkZpbHRlclZNLFxuICAgICAgICAgIGVycm9yID0gbS5wcm9wKCcnKSxcbiAgICAgICAgICBpdGVtQnVpbGRlciA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnQWRtaW5Vc2VyJyxcbiAgICAgICAgICAgICAgd3JhcHBlckNsYXNzOiAnLnctY29sLnctY29sLTQnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb21wb25lbnQ6ICdBZG1pblByb2plY3QnLFxuICAgICAgICAgICAgICB3cmFwcGVyQ2xhc3M6ICcudy1jb2wudy1jb2wtNCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbXBvbmVudDogJ0FkbWluQ29udHJpYnV0aW9uJyxcbiAgICAgICAgICAgICAgd3JhcHBlckNsYXNzOiAnLnctY29sLnctY29sLTInXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb21wb25lbnQ6ICdQYXltZW50U3RhdHVzJyxcbiAgICAgICAgICAgICAgd3JhcHBlckNsYXNzOiAnLnctY29sLnctY29sLTInXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBpdGVtQWN0aW9ucyA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnQWRtaW5JbnB1dEFjdGlvbicsXG4gICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJ3VzZXJfaWQnLFxuICAgICAgICAgICAgICAgIHVwZGF0ZUtleTogJ2lkJyxcbiAgICAgICAgICAgICAgICBjYWxsVG9BY3Rpb246ICdUcmFuc2ZlcmlyJyxcbiAgICAgICAgICAgICAgICBpbm5lckxhYmVsOiAnSWQgZG8gbm92byBhcG9pYWRvcjonLFxuICAgICAgICAgICAgICAgIG91dGVyTGFiZWw6ICdUcmFuc2ZlcmlyIEFwb2lvJyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogJ2V4OiAxMjk5MDgnLFxuICAgICAgICAgICAgICAgIG1vZGVsOiBjLm1vZGVscy5jb250cmlidXRpb25EZXRhaWxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnQWRtaW5SYWRpb0FjdGlvbicsXG4gICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBnZXRLZXk6ICdwcm9qZWN0X2lkJyxcbiAgICAgICAgICAgICAgICB1cGRhdGVLZXk6ICdjb250cmlidXRpb25faWQnLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAncmV3YXJkX2lkJyxcbiAgICAgICAgICAgICAgICByYWRpb3M6ICdyZXdhcmRzJyxcbiAgICAgICAgICAgICAgICBjYWxsVG9BY3Rpb246ICdBbHRlcmFyIFJlY29tcGVuc2EnLFxuICAgICAgICAgICAgICAgIG91dGVyTGFiZWw6ICdSZWNvbXBlbnNhJyxcbiAgICAgICAgICAgICAgICBnZXRNb2RlbDogYy5tb2RlbHMucHJvamVjdERldGFpbCxcbiAgICAgICAgICAgICAgICB1cGRhdGVNb2RlbDogYy5tb2RlbHMuY29udHJpYnV0aW9uRGV0YWlsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbXBvbmVudDogJ0FkbWluSW5wdXRBY3Rpb24nLFxuICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcHJvcGVydHk6ICdzdGF0ZScsXG4gICAgICAgICAgICAgICAgdXBkYXRlS2V5OiAnaWQnLFxuICAgICAgICAgICAgICAgIGNhbGxUb0FjdGlvbjogJ0FwYWdhcicsXG4gICAgICAgICAgICAgICAgaW5uZXJMYWJlbDogJ1RlbSBjZXJ0ZXphIHF1ZSBkZXNlamEgYXBhZ2FyIGVzc2UgYXBvaW8/JyxcbiAgICAgICAgICAgICAgICBvdXRlckxhYmVsOiAnQXBhZ2FyIEFwb2lvJyxcbiAgICAgICAgICAgICAgICBmb3JjZVZhbHVlOiAnZGVsZXRlZCcsXG4gICAgICAgICAgICAgICAgbW9kZWw6IGMubW9kZWxzLmNvbnRyaWJ1dGlvbkRldGFpbFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBmaWx0ZXJCdWlsZGVyID0gW1xuICAgICAgICAgICAgeyAvL2Z1bGxfdGV4dF9pbmRleFxuICAgICAgICAgICAgICBjb21wb25lbnQ6ICdGaWx0ZXJNYWluJyxcbiAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHZtOiBmaWx0ZXJWTS5mdWxsX3RleHRfaW5kZXgsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6ICdCdXNxdWUgcG9yIHByb2pldG8sIGVtYWlsLCBJZHMgZG8gdXN1w6FyaW8gZSBkbyBhcG9pby4uLidcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHsgLy9zdGF0ZVxuICAgICAgICAgICAgICBjb21wb25lbnQ6ICdGaWx0ZXJEcm9wZG93bicsXG4gICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NvbSBvIGVzdGFkbycsXG4gICAgICAgICAgICAgICAgbmFtZTogJ3N0YXRlJyxcbiAgICAgICAgICAgICAgICB2bTogZmlsdGVyVk0uc3RhdGUsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnJywgb3B0aW9uOiAnUXVhbHF1ZXIgdW0nfSxcbiAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJ3BhaWQnLCBvcHRpb246ICdwYWlkJ30sXG4gICAgICAgICAgICAgICAgICB7dmFsdWU6ICdyZWZ1c2VkJywgb3B0aW9uOiAncmVmdXNlZCd9LFxuICAgICAgICAgICAgICAgICAge3ZhbHVlOiAncGVuZGluZycsIG9wdGlvbjogJ3BlbmRpbmcnfSxcbiAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJ3BlbmRpbmdfcmVmdW5kJywgb3B0aW9uOiAncGVuZGluZ19yZWZ1bmQnfSxcbiAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJ3JlZnVuZGVkJywgb3B0aW9uOiAncmVmdW5kZWQnfSxcbiAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJ2NoYXJnZWJhY2snLCBvcHRpb246ICdjaGFyZ2ViYWNrJ30sXG4gICAgICAgICAgICAgICAgICB7dmFsdWU6ICdkZWxldGVkJywgb3B0aW9uOiAnZGVsZXRlZCd9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeyAvL2dhdGV3YXlcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnRmlsdGVyRHJvcGRvd24nLFxuICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdnYXRld2F5JyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2F0ZXdheScsXG4gICAgICAgICAgICAgICAgdm06IGZpbHRlclZNLmdhdGV3YXksXG4gICAgICAgICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnJywgb3B0aW9uOiAnUXVhbHF1ZXIgdW0nfSxcbiAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJ1BhZ2FybWUnLCBvcHRpb246ICdQYWdhcm1lJ30sXG4gICAgICAgICAgICAgICAgICB7dmFsdWU6ICdNb0lQJywgb3B0aW9uOiAnTW9JUCd9LFxuICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnUGF5UGFsJywgb3B0aW9uOiAnUGF5UGFsJ30sXG4gICAgICAgICAgICAgICAgICB7dmFsdWU6ICdDcmVkaXRzJywgb3B0aW9uOiAnQ3LDqWRpdG9zJ31cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7IC8vdmFsdWVcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnRmlsdGVyTnVtYmVyUmFuZ2UnLFxuICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbGFiZWw6ICdWYWxvcmVzIGVudHJlJyxcbiAgICAgICAgICAgICAgICBmaXJzdDogZmlsdGVyVk0udmFsdWUuZ3RlLFxuICAgICAgICAgICAgICAgIGxhc3Q6IGZpbHRlclZNLnZhbHVlLmx0ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeyAvL2NyZWF0ZWRfYXRcbiAgICAgICAgICAgICAgY29tcG9uZW50OiAnRmlsdGVyRGF0ZVJhbmdlJyxcbiAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGxhYmVsOiAnUGVyw61vZG8gZG8gYXBvaW8nLFxuICAgICAgICAgICAgICAgIGZpcnN0OiBmaWx0ZXJWTS5jcmVhdGVkX2F0Lmd0ZSxcbiAgICAgICAgICAgICAgICBsYXN0OiBmaWx0ZXJWTS5jcmVhdGVkX2F0Lmx0ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICBzdWJtaXQgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbGlzdFZNLmZpcnN0UGFnZShmaWx0ZXJWTS5wYXJhbWV0ZXJzKCkpLnRoZW4obnVsbCwgZnVuY3Rpb24oc2VydmVyRXJyb3Ipe1xuICAgICAgICAgICAgICBlcnJvcihzZXJ2ZXJFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbHRlclZNOiBmaWx0ZXJWTSxcbiAgICAgICAgZmlsdGVyQnVpbGRlcjogZmlsdGVyQnVpbGRlcixcbiAgICAgICAgaXRlbUFjdGlvbnM6IGl0ZW1BY3Rpb25zLFxuICAgICAgICBpdGVtQnVpbGRlcjogaXRlbUJ1aWxkZXIsXG4gICAgICAgIGxpc3RWTToge2xpc3Q6IGxpc3RWTSwgZXJyb3I6IGVycm9yfSxcbiAgICAgICAgc3VibWl0OiBzdWJtaXRcbiAgICAgIH07XG4gICAgfSxcblxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwpe1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbS5jb21wb25lbnQoYy5BZG1pbkZpbHRlcix7Zm9ybTogY3RybC5maWx0ZXJWTS5mb3JtRGVzY3JpYmVyLCBmaWx0ZXJCdWlsZGVyOiBjdHJsLmZpbHRlckJ1aWxkZXIsIHN1Ym1pdDogY3RybC5zdWJtaXR9KSxcbiAgICAgICAgbS5jb21wb25lbnQoYy5BZG1pbkxpc3QsIHt2bTogY3RybC5saXN0Vk0sIGl0ZW1CdWlsZGVyOiBjdHJsLml0ZW1CdWlsZGVyLCBpdGVtQWN0aW9uczogY3RybC5pdGVtQWN0aW9uc30pXG4gICAgICBdO1xuICAgIH1cbiAgfTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLCB3aW5kb3cuYy5oKSk7XG4iLCJ3aW5kb3cuYy5jb250cmlidXRpb24uUHJvamVjdHNIb21lID0gKChtLCBjKSA9PiB7XG4gIHJldHVybiB7XG4gICAgY29udHJvbGxlcjogKCkgPT4ge1xuICAgICAgbGV0IHZtID0ge1xuICAgICAgICByZWNvbW1lbmRlZENvbGxlY3Rpb246IG0ucHJvcChbXSksXG4gICAgICAgIHJlY2VudENvbGxlY3Rpb246IG0ucHJvcChbXSksXG4gICAgICAgIG5lYXJNZUNvbGxlY3Rpb246IG0ucHJvcChbXSksXG4gICAgICAgIGV4cGlyaW5nQ29sbGVjdGlvbjogbS5wcm9wKFtdKVxuICAgICAgfSxcbiAgICAgIHByb2plY3QgPSBjLm1vZGVscy5wcm9qZWN0LFxuXG4gICAgICBleHBpcmluZyA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTSh7ZXhwaXJlc19hdDogJ2x0ZScsIHN0YXRlOiAnZXEnfSksXG4gICAgICBuZWFyTWUgPSBtLnBvc3RncmVzdC5maWx0ZXJzVk0oe25lYXJfbWU6ICdlcScsIHN0YXRlOiAnZXEnfSksXG4gICAgICByZWNlbnRzID0gbS5wb3N0Z3Jlc3QuZmlsdGVyc1ZNKHtvbmxpbmVfZGF0ZTogJ2d0ZScsIHN0YXRlOiAnZXEnfSksXG4gICAgICByZWNvbW1lbmRlZCA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTSh7cmVjb21tZW5kZWQ6ICdlcScsIHN0YXRlOiAnZXEnfSk7XG5cbiAgICAgIGV4cGlyaW5nLmV4cGlyZXNfYXQobW9tZW50KCkuYWRkKDE0LCAnZGF5cycpLmZvcm1hdCgnWVlZWS1NTS1ERCcpKTtcbiAgICAgIGV4cGlyaW5nLnN0YXRlKCdvbmxpbmUnKTtcblxuICAgICAgbmVhck1lLm5lYXJfbWUoJ3RydWUnKS5zdGF0ZSgnb25saW5lJyk7XG5cbiAgICAgIHJlY2VudHMub25saW5lX2RhdGUobW9tZW50KCkuc3VidHJhY3QoNSwgJ2RheXMnKS5mb3JtYXQoJ1lZWVktTU0tREQnKSk7XG4gICAgICByZWNlbnRzLnN0YXRlKCdvbmxpbmUnKTtcblxuICAgICAgcmVjb21tZW5kZWQucmVjb21tZW5kZWQoJ3RydWUnKS5zdGF0ZSgnb25saW5lJyk7XG5cbiAgICAgIHByb2plY3QuZ2V0UGFnZVdpdGhUb2tlbihuZWFyTWUucGFyYW1ldGVycygpKS50aGVuKHZtLm5lYXJNZUNvbGxlY3Rpb24pO1xuICAgICAgcHJvamVjdC5nZXRQYWdlKHJlY29tbWVuZGVkLnBhcmFtZXRlcnMoKSkudGhlbih2bS5yZWNvbW1lbmRlZENvbGxlY3Rpb24pO1xuICAgICAgcHJvamVjdC5nZXRQYWdlKHJlY2VudHMucGFyYW1ldGVycygpKS50aGVuKHZtLnJlY2VudENvbGxlY3Rpb24pO1xuICAgICAgcHJvamVjdC5nZXRQYWdlKGV4cGlyaW5nLnBhcmFtZXRlcnMoKSkudGhlbih2bS5leHBpcmluZ0NvbGxlY3Rpb24pO1xuXG4gICAgICBsZXQgY29sbGVjdGlvbnMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ1Byw7N4aW1vcyBhIHZvY8OqJyxcbiAgICAgICAgICBoYXNoOiAnbmVhcl9vZicsXG4gICAgICAgICAgY29sbGVjdGlvbjogdm0ubmVhck1lQ29sbGVjdGlvblxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdSZWNvbWVuZGFkb3MnLFxuICAgICAgICAgIGhhc2g6ICdyZWNvbW1lbmRlZCcsXG4gICAgICAgICAgY29sbGVjdGlvbjogdm0ucmVjb21tZW5kZWRDb2xsZWN0aW9uXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ05hIHJldGEgZmluYWwnLFxuICAgICAgICAgIGhhc2g6ICdleHBpcmluZycsXG4gICAgICAgICAgY29sbGVjdGlvbjogdm0uZXhwaXJpbmdDb2xsZWN0aW9uXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ1JlY2VudGVzJyxcbiAgICAgICAgICBoYXNoOiAncmVjZW50JyxcbiAgICAgICAgICBjb2xsZWN0aW9uOiB2bS5yZWNlbnRDb2xsZWN0aW9uXG4gICAgICAgIH1cbiAgICAgIF07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbGxlY3Rpb25zOiBjb2xsZWN0aW9uc1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgdmlldzogKGN0cmwpID0+IHtcbiAgICAgIHJldHVybiBfLm1hcChjdHJsLmNvbGxlY3Rpb25zLCAoY29sbGVjdGlvbikgPT4ge1xuICAgICAgICByZXR1cm4gbS5jb21wb25lbnQoYy5Qcm9qZWN0Um93LCB7Y29sbGVjdGlvbjogY29sbGVjdGlvbiwgcmVmOiBgaG9tZV8ke2NvbGxlY3Rpb24uaGFzaH1gfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYykpO1xuIiwid2luZG93LmMucGFnZXMuTGl2ZVN0YXRpc3RpY3MgPSAoKG0sIG1vZGVscywgaCwgXywgSlNPTikgPT4ge1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IChhcmdzID0ge30pID0+IHtcbiAgICAgIGxldCBwYWdlU3RhdGlzdGljcyA9IG0ucHJvcChbXSksXG4gICAgICAgICAgbm90aWZpY2F0aW9uRGF0YSA9IG0ucHJvcCh7fSk7XG5cbiAgICAgIG1vZGVscy5zdGF0aXN0aWMuZ2V0Um93KCkudGhlbihwYWdlU3RhdGlzdGljcyk7XG4gICAgICAvLyBhcmdzLnNvY2tldCBpcyBhIHNvY2tldCBwcm92aWRlZCBieSBzb2NrZXQuaW9cbiAgICAgIC8vIGNhbiBzZWUgdGhlcmUgaHR0cHM6Ly9naXRodWIuY29tL2NhdGFyc2UvY2F0YXJzZS1saXZlL2Jsb2IvbWFzdGVyL3B1YmxpYy9pbmRleC5qcyNMOFxuICAgICAgaWYgKGFyZ3Muc29ja2V0ICYmIF8uaXNGdW5jdGlvbihhcmdzLnNvY2tldC5vbikpIHtcbiAgICAgICAgYXJncy5zb2NrZXQub24oJ25ld19wYWlkX2NvbnRyaWJ1dGlvbnMnLCAobXNnKSA9PiB7XG4gICAgICAgICAgbm90aWZpY2F0aW9uRGF0YShKU09OLnBhcnNlKG1zZy5wYXlsb2FkKSk7XG4gICAgICAgICAgbW9kZWxzLnN0YXRpc3RpYy5nZXRSb3coKS50aGVuKHBhZ2VTdGF0aXN0aWNzKTtcbiAgICAgICAgICBtLnJlZHJhdygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFnZVN0YXRpc3RpY3M6IHBhZ2VTdGF0aXN0aWNzLFxuICAgICAgICBub3RpZmljYXRpb25EYXRhOiBub3RpZmljYXRpb25EYXRhXG4gICAgICB9O1xuICAgIH0sXG4gICAgdmlldzogKGN0cmwpID0+IHtcbiAgICAgIGxldCBkYXRhID0gY3RybC5ub3RpZmljYXRpb25EYXRhKCk7XG5cbiAgICAgIHJldHVybiBtKCcudy1zZWN0aW9uLmJnLXN0YXRzLnNlY3Rpb24ubWluLWhlaWdodC0xMDAnLCBbXG4gICAgICAgIG0oJy53LWNvbnRhaW5lci51LXRleHQtY2VudGVyJywgXy5tYXAoY3RybC5wYWdlU3RhdGlzdGljcygpLCAoc3RhdCkgPT4ge1xuICAgICAgICAgIHJldHVybiBbbSgnaW1nLnUtbWFyZ2luYm90dG9tLTYwW3NyYz1cImh0dHBzOi8vZGFrczJrM2E0aWIyei5jbG91ZGZyb250Lm5ldC81NGI0NDBiODU2MDhlM2Y0Mzg5ZGIzODcvNTVhZGE1ZGQxMWIzNmE1MjYxNmQ5N2RmX3N5bWJvbC1jYXRhcnNlLnBuZ1wiXScpLFxuICAgICAgICAgIG0oJy5mb250Y29sb3ItbmVnYXRpdmUudS1tYXJnaW5ib3R0b20tNDAnLCBbXG4gICAgICAgICAgICBtKCcuZm9udHNpemUtbWVnYWp1bWJvLmZvbnR3ZWlnaHQtc2VtaWJvbGQnLCAnUiQgJyArIGguZm9ybWF0TnVtYmVyKHN0YXQudG90YWxfY29udHJpYnV0ZWQsIDIsIDMpKSxcbiAgICAgICAgICAgIG0oJy5mb250c2l6ZS1sYXJnZScsICdEb2Fkb3MgcGFyYSBwcm9qZXRvcyBwdWJsaWNhZG9zIHBvciBhcXVpJylcbiAgICAgICAgICBdKSxcbiAgICAgICAgICBtKCcuZm9udGNvbG9yLW5lZ2F0aXZlLnUtbWFyZ2luYm90dG9tLTYwJywgW1xuICAgICAgICAgICAgbSgnLmZvbnRzaXplLW1lZ2FqdW1iby5mb250d2VpZ2h0LXNlbWlib2xkJywgc3RhdC50b3RhbF9jb250cmlidXRvcnMpLFxuICAgICAgICAgICAgbSgnLmZvbnRzaXplLWxhcmdlJywgJ1Blc3NvYXMgasOhIGFwb2lhcmFtIHBlbG8gbWVub3MgMSBwcm9qZXRvIG5vIENhdGFyc2UnKVxuICAgICAgICAgIF0pXTtcbiAgICAgICAgfSkpLFxuICAgICAgICAoIV8uaXNFbXB0eShkYXRhKSA/IG0oJy53LWNvbnRhaW5lcicsIFtcbiAgICAgICAgICBtKCdkaXYnLCBbXG4gICAgICAgICAgICBtKCcuY2FyZC51LXJhZGl1cy51LW1hcmdpbmJvdHRvbS02MC5tZWRpdW0nLCBbXG4gICAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNCcsIFtcbiAgICAgICAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTQudy1jb2wtc21hbGwtNCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCdpbWcudGh1bWIudS1yb3VuZFtzcmM9XCInICsgZGF0YS51c2VyX2ltYWdlICsgJ1wiXScpXG4gICAgICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtOC53LWNvbC1zbWFsbC04JywgW1xuICAgICAgICAgICAgICAgICAgICAgIG0oJy5mb250c2l6ZS1sYXJnZS5saW5laGVpZ2h0LXRpZ2h0JywgZGF0YS51c2VyX25hbWUpXG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00LnUtdGV4dC1jZW50ZXIuZm9udHNpemUtYmFzZS51LW1hcmdpbnRvcC0yMCcsIFtcbiAgICAgICAgICAgICAgICAgIG0oJ2RpdicsICdhY2Fib3UgZGUgYXBvaWFyIG8nKVxuICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC00JywgW1xuICAgICAgICAgICAgICAgICAgbSgnLnctcm93JywgW1xuICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtNC53LWNvbC1zbWFsbC00JywgW1xuICAgICAgICAgICAgICAgICAgICAgIG0oJ2ltZy50aHVtYi1wcm9qZWN0LnUtcmFkaXVzW3NyYz1cIicgKyBkYXRhLnByb2plY3RfaW1hZ2UgKyAnXCJdW3dpZHRoPVwiNzVcIl0nKVxuICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTgudy1jb2wtc21hbGwtOCcsIFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCcuZm9udHNpemUtbGFyZ2UubGluZWhlaWdodC10aWdodCcsIGRhdGEucHJvamVjdF9uYW1lKVxuICAgICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgICAgXSlcbiAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgXSlcbiAgICAgICAgICBdKVxuICAgICAgICBdKSA6ICcnKSxcbiAgICAgICAgbSgnLnUtdGV4dC1jZW50ZXIuZm9udHNpemUtbGFyZ2UudS1tYXJnaW5ib3R0b20tMTAuZm9udGNvbG9yLW5lZ2F0aXZlJywgW1xuICAgICAgICAgIG0oJ2EubGluay1oaWRkZW4uZm9udGNvbG9yLW5lZ2F0aXZlW2hyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2F0YXJzZVwiXVt0YXJnZXQ9XCJfYmxhbmtcIl0nLCBbXG4gICAgICAgICAgICBtKCdzcGFuLmZhLmZhLWdpdGh1YicsICcuJyksJyBPcGVuIFNvdXJjZSBjb20gb3JndWxobyEgJ1xuICAgICAgICAgIF0pXG4gICAgICAgIF0pLFxuICAgICAgXSk7XG4gICAgfVxuICB9O1xufSh3aW5kb3cubSwgd2luZG93LmMubW9kZWxzLCB3aW5kb3cuYy5oLCB3aW5kb3cuXywgd2luZG93LkpTT04pKTtcbiIsIndpbmRvdy5jLnBhZ2VzLlRlYW0gPSAoZnVuY3Rpb24obSwgYyl7XG4gIHJldHVybiB7XG4gICAgdmlldzogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbSgnI3N0YXRpYy10ZWFtLWFwcCcsW1xuICAgICAgICBtLmNvbXBvbmVudChjLlRlYW1Ub3RhbCksXG4gICAgICAgIG0uY29tcG9uZW50KGMuVGVhbU1lbWJlcnMpXG4gICAgICBdKTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYykpO1xuIiwid2luZG93LmMucHJvamVjdC5JbnNpZ2h0cyA9IChmdW5jdGlvbihtLCBjLCBtb2RlbHMsIF8pe1xuICByZXR1cm4ge1xuICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgIHZhciB2bSA9IG0ucG9zdGdyZXN0LmZpbHRlcnNWTSh7cHJvamVjdF9pZDogJ2VxJ30pLFxuICAgICAgICAgIHByb2plY3REZXRhaWxzID0gbS5wcm9wKFtdKSxcbiAgICAgICAgICBjb250cmlidXRpb25zUGVyRGF5ID0gbS5wcm9wKFtdKTtcblxuICAgICAgdm0ucHJvamVjdF9pZChhcmdzLnJvb3QuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJykpO1xuXG4gICAgICBtb2RlbHMucHJvamVjdERldGFpbC5nZXRSb3codm0ucGFyYW1ldGVycygpKS50aGVuKHByb2plY3REZXRhaWxzKTtcbiAgICAgIG1vZGVscy5wcm9qZWN0Q29udHJpYnV0aW9uc1BlckRheS5nZXRSb3codm0ucGFyYW1ldGVycygpKS50aGVuKGNvbnRyaWJ1dGlvbnNQZXJEYXkpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB2bTogdm0sXG4gICAgICAgIHByb2plY3REZXRhaWxzOiBwcm9qZWN0RGV0YWlscyxcbiAgICAgICAgY29udHJpYnV0aW9uc1BlckRheTogY29udHJpYnV0aW9uc1BlckRheVxuICAgICAgfTtcbiAgICB9LFxuICAgIHZpZXc6IGZ1bmN0aW9uKGN0cmwpIHtcbiAgICAgIHJldHVybiBfLm1hcChjdHJsLnByb2plY3REZXRhaWxzKCksIGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgICByZXR1cm4gbSgnLnByb2plY3QtaW5zaWdodHMnLFtcbiAgICAgICAgICBtKCcudy1jb250YWluZXInLCBbXG4gICAgICAgICAgICBtKCcudy1yb3cudS1tYXJnaW5ib3R0b20tNDAnLCBbXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0yJyksXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC04LmRhc2hib2FyZC1oZWFkZXIudS10ZXh0LWNlbnRlcicsIFtcbiAgICAgICAgICAgICAgICBtKCcuZm9udHdlaWdodC1zZW1pYm9sZC5mb250c2l6ZS1sYXJnZXIubGluZWhlaWdodC1sb29zZXIudS1tYXJnaW5ib3R0b20tMTAnLCAnTWluaGEgY2FtcGFuaGEnKSxcbiAgICAgICAgICAgICAgICBtLmNvbXBvbmVudChjLkFkbWluUHJvamVjdERldGFpbHNDYXJkLCB7cmVzb3VyY2U6IHByb2plY3R9KSxcbiAgICAgICAgICAgICAgICBtLmNvbXBvbmVudChjLkFkbWluUHJvamVjdERldGFpbHNFeHBsYW5hdGlvbiwge3Jlc291cmNlOiBwcm9qZWN0fSlcbiAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgIG0oJy53LWNvbC53LWNvbC0yJylcbiAgICAgICAgICAgIF0pXG4gICAgICAgICAgXSksXG4gICAgICAgICAgKGZ1bmN0aW9uKHByb2plY3Qpe1xuICAgICAgICAgICAgaWYgKHByb2plY3QuaXNfcHVibGlzaGVkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgbSgnLmRpdmlkZXInKSxcbiAgICAgICAgICAgICAgICBtKCcudy1zZWN0aW9uLnNlY3Rpb24tb25lLWNvbHVtbi5iZy1ncmF5LmJlZm9yZS1mb290ZXInLCBbXG4gICAgICAgICAgICAgICAgICBtKCcudy1jb250YWluZXInLCBbXG4gICAgICAgICAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMTIudS10ZXh0LWNlbnRlcicsIHtzdHlsZTogeydtaW4taGVpZ2h0JzogJzMwMHB4J319LCBbXG4gICAgICAgICAgICAgICAgICAgICAgICBtLmNvbXBvbmVudChjLlByb2plY3RDaGFydENvbnRyaWJ1dGlvblRvdGFsUGVyRGF5LCB7Y29sbGVjdGlvbjogY3RybC5jb250cmlidXRpb25zUGVyRGF5fSlcbiAgICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMTIudS10ZXh0LWNlbnRlcicsIHtzdHlsZTogeydtaW4taGVpZ2h0JzogJzMwMHB4J319LCBbXG4gICAgICAgICAgICAgICAgICAgICAgICBtLmNvbXBvbmVudChjLlByb2plY3RDaGFydENvbnRyaWJ1dGlvbkFtb3VudFBlckRheSwge2NvbGxlY3Rpb246IGN0cmwuY29udHJpYnV0aW9uc1BlckRheX0pXG4gICAgICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgICAgICAgICBtKCcudy1yb3cnLCBbXG4gICAgICAgICAgICAgICAgICAgICAgbSgnLnctY29sLnctY29sLTEyLnUtdGV4dC1jZW50ZXInLCBbXG4gICAgICAgICAgICAgICAgICAgICAgICBtLmNvbXBvbmVudChjLlByb2plY3RDb250cmlidXRpb25zUGVyTG9jYXRpb25UYWJsZSwge3Jlc291cmNlSWQ6IGN0cmwudm0ucHJvamVjdF9pZCgpfSlcbiAgICAgICAgICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICAgIG0oJy53LXJvdycsIFtcbiAgICAgICAgICAgICAgICAgICAgICBtKCcudy1jb2wudy1jb2wtMTIudS10ZXh0LWNlbnRlcicsIFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG0uY29tcG9uZW50KGMuUHJvamVjdFJlbWluZGVyQ291bnQsIHtyZXNvdXJjZTogcHJvamVjdH0pXG4gICAgICAgICAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfShwcm9qZWN0KSlcbiAgICAgICAgXSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KHdpbmRvdy5tLCB3aW5kb3cuYywgd2luZG93LmMubW9kZWxzLCB3aW5kb3cuXykpO1xuIiwid2luZG93LmMuYWRtaW4uY29udHJpYnV0aW9uRmlsdGVyVk0gPSAoZnVuY3Rpb24obSwgaCwgcmVwbGFjZURpYWNyaXRpY3Mpe1xuICB2YXIgdm0gPSBtLnBvc3RncmVzdC5maWx0ZXJzVk0oe1xuICAgIGZ1bGxfdGV4dF9pbmRleDogJ0BAJyxcbiAgICBzdGF0ZTogJ2VxJyxcbiAgICBnYXRld2F5OiAnZXEnLFxuICAgIHZhbHVlOiAnYmV0d2VlbicsXG4gICAgY3JlYXRlZF9hdDogJ2JldHdlZW4nXG4gIH0pLFxuXG4gIHBhcmFtVG9TdHJpbmcgPSBmdW5jdGlvbihwKXtcbiAgICByZXR1cm4gKHAgfHwgJycpLnRvU3RyaW5nKCkudHJpbSgpO1xuICB9O1xuXG4gIC8vIFNldCBkZWZhdWx0IHZhbHVlc1xuICB2bS5zdGF0ZSgnJyk7XG4gIHZtLmdhdGV3YXkoJycpO1xuICB2bS5vcmRlcih7aWQ6ICdkZXNjJ30pO1xuXG4gIHZtLmNyZWF0ZWRfYXQubHRlLnRvRmlsdGVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZmlsdGVyID0gcGFyYW1Ub1N0cmluZyh2bS5jcmVhdGVkX2F0Lmx0ZSgpKTtcbiAgICByZXR1cm4gZmlsdGVyICYmIGgubW9tZW50RnJvbVN0cmluZyhmaWx0ZXIpLmVuZE9mKCdkYXknKS5mb3JtYXQoJycpO1xuICB9O1xuXG4gIHZtLmNyZWF0ZWRfYXQuZ3RlLnRvRmlsdGVyID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZmlsdGVyID0gcGFyYW1Ub1N0cmluZyh2bS5jcmVhdGVkX2F0Lmd0ZSgpKTtcbiAgICByZXR1cm4gZmlsdGVyICYmIGgubW9tZW50RnJvbVN0cmluZyhmaWx0ZXIpLmZvcm1hdCgpO1xuICB9O1xuXG4gIHZtLmZ1bGxfdGV4dF9pbmRleC50b0ZpbHRlciA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGZpbHRlciA9IHBhcmFtVG9TdHJpbmcodm0uZnVsbF90ZXh0X2luZGV4KCkpO1xuICAgIHJldHVybiBmaWx0ZXIgJiYgcmVwbGFjZURpYWNyaXRpY3MoZmlsdGVyKSB8fCB1bmRlZmluZWQ7XG4gIH07XG5cbiAgcmV0dXJuIHZtO1xufSh3aW5kb3cubSwgd2luZG93LmMuaCwgd2luZG93LnJlcGxhY2VEaWFjcml0aWNzKSk7XG4iLCJ3aW5kb3cuYy5hZG1pbi5jb250cmlidXRpb25MaXN0Vk0gPSAoZnVuY3Rpb24obSwgbW9kZWxzKSB7XG4gIHJldHVybiBtLnBvc3RncmVzdC5wYWdpbmF0aW9uVk0obW9kZWxzLmNvbnRyaWJ1dGlvbkRldGFpbC5nZXRQYWdlV2l0aFRva2VuKTtcbn0od2luZG93Lm0sIHdpbmRvdy5jLm1vZGVscykpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9