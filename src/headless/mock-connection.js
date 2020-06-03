import { Connection } from './connection.js';
import { Strophe } from 'strophe.js/src/core';
import { _converse, api } from './converse-core.js';
import { isElement, noop } from 'lodash';


export class MockConnection extends Connection {

    constructor (service, options) {
        super(service, options);

        this.sent_stanzas = [];
        this.IQ_stanzas = [];
        this.IQ_ids = [];

        this.features = Strophe.xmlHtmlNode(
            '<stream:features xmlns:stream="http://etherx.jabber.org/streams" xmlns="jabber:client">'+
                '<ver xmlns="urn:xmpp:features:rosterver"/>'+
                '<csi xmlns="urn:xmpp:csi:0"/>'+
                '<this xmlns="http://jabber.org/protocol/caps" ver="UwBpfJpEt3IoLYfWma/o/p3FFRo=" hash="sha-1" node="http://prosody.im"/>'+
                '<bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">'+
                    '<required/>'+
                '</bind>'+
                `<sm xmlns='urn:xmpp:sm:3'/>`+
                '<session xmlns="urn:ietf:params:xml:ns:xmpp-session">'+
                    '<optional/>'+
                '</session>'+
            '</stream:features>').firstChild;

        this._proto._processRequest = noop;
        this._proto._disconnect = () => this._onDisconnectTimeout();
        this._proto._onDisconnectTimeout = noop;
        this._proto._connect = () => {
            this.connected = true;
            this.mock = true;
            this.jid = 'romeo@montague.lit/orchard';
            this._changeConnectStatus(Strophe.Status.BINDREQUIRED);
        }
    }

    _processRequest () { // eslint-disable-line class-methods-use-this
        // Don't attempt to send out stanzas
    }

    sendIQ (iq, callback, errback) {
        if (!isElement(iq)) {
            iq = iq.nodeTree;
        }
        this.IQ_stanzas.push(iq);
        const id = super.sendIQ(iq, callback, errback);
        this.IQ_ids.push(id);
        return id;
    }

    send (stanza) {
        if (isElement(stanza)) {
            this.sent_stanzas.push(stanza);
        } else {
            this.sent_stanzas.push(stanza.nodeTree);
        }
        return super.send(stanza);
    }

    async bind () {
        /**
         * Synchronous event triggered before we send an IQ to bind the user's
         * JID resource for this session.
         * @event _converse#beforeResourceBinding
         */
        await api.trigger('beforeResourceBinding', {'synchronous': true});
        this.authenticated = true;
        if (!_converse.no_connection_on_bind) {
            this._changeConnectStatus(Strophe.Status.CONNECTED);
        }
    }
}
