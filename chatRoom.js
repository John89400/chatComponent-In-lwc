import { LightningElement, track, api, wire } from 'lwc';
import { subscribe } from 'lightning/empApi';
import publishChatMessage from '@salesforce/apex/ChatPublisher.publishMessage';
import USER_ID from '@salesforce/user/Id';
import USER_NAME_FIELD from '@salesforce/schema/User.Name';
import { getRecord } from 'lightning/uiRecordApi';

export default class ChatRoom extends LightningElement {
    @track messages = [];
    @track newMessage = '';
    @track typingIndicator = '';
    @track userName = '';
    @track showEmojiPicker = false;
    channelName = '/event/ChatMessage__e';

    typingTimeout;

    @api userId = USER_ID;

    @wire(getRecord, { recordId: '$userId', fields: [USER_NAME_FIELD] })
    wiredUser({ error, data }) {
        if (data) {
            this.userName = data.fields.Name.value;
        } else if (error) {
            console.error('Error fetching user name:', error);
        }
    }

    connectedCallback() {
        this.handleSubscribe();
    }

    handleSubscribe() {
        const messageCallback = (response) => {
            const message = {
                id: response.data.event.replayId,
                username: response.data.payload.Username__c,
                message: response.data.payload.Message__c,
                timestamp: response.data.payload.CreatedDate,
                className: this.getMessageClass(response.data.payload.Username__c)
            };
            this.messages = [...this.messages, message];
            this.typingIndicator = '';  // Clear typing indicator when a message is received
        };

        subscribe(this.channelName, -1, messageCallback).then((response) => {
            console.log('Successfully subscribed to: ', JSON.stringify(response.channel));
        });
    }

    handleInputChange(event) {
        this.newMessage = event.target.value;

        // Show typing indicator
        this.typingIndicator = `${this.userName} is typing...`;
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.typingIndicator = '';
        }, 2000); // Typing indicator lasts for 2 seconds after the last keypress
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    sendMessage() {
        if (this.newMessage.trim()) {
            publishChatMessage({
                message: this.newMessage,
                username: this.userName,
                channel: 'General' // replace with dynamic channel if needed
            })
            .then(() => {
                this.newMessage = '';
                this.typingIndicator = ''; // Clear typing indicator after sending the message
            })
            .catch((error) => {
                console.error('Error publishing chat message: ', error);
            });
        }
    }

    getMessageClass(username) {
        return username === this.userName ? 'my-message' : 'other-message';
    }

    toggleEmojiPicker() {
        this.showEmojiPicker = !this.showEmojiPicker;
    }

    addEmoji(event) {
        this.newMessage += event.target.textContent;
        this.toggleEmojiPicker(); // Close emoji picker after selecting an emoji
    }
}
