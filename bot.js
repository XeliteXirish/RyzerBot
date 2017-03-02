const Twit = require('twit');
const config = require('./config.json');

//TODO 1/ Find controversial tweets from the #

const bot = new Twit({
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token: config.access_token,
    access_token_secret: config.access_token_secret
});

let stream = bot.stream('user');

stream.on('follow', followed);

// Just looking at the event but I could tweet back!
function followed(event) {
    let name = event.source.name;
    let screenName = event.source.screen_name;
    
    console.log('I was followed by: ' + name + ' ' + screenName);
}

console.log('The bot is running...');

// Now looking for tweet events
// See: https://dev.twitter.com/streaming/userstreams
stream.on('tweet', tweetEvent);


function tweetEvent(tweet) {

    // Who is this in reply to?
    let reply_to = tweet.in_reply_to_screen_name;
    // Who sent the tweet?
    let name = tweet.user.screen_name;
    // What is the text?
    let txt = tweet.text;

    // Ok, if this was in reply to me
    if (reply_to === 'RyzerBot') {

        // Get rid of the @ mention
        txt = txt.replace(/@RyzerBot/g, '');

        // Start a reply back to the sender
        let reply = '.@' + name + ' ';
        // Reverse their text
        for (let i = txt.length - 1; i >= 0; i--) {
            reply += txt.charAt(i);
        }

        // Post that tweet!
        bot.post('statuses/update', {status: reply}, tweeted);

        // Make sure it worked!
        function tweeted(err, reply) {
            if (err !== undefined) {
                console.log(err);
            } else {
                console.log('Tweeted: ' + reply);
            }
        };
    }

}