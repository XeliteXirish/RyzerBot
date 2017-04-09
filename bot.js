const Twit = require('twit');
const mysql = require('mysql');
const config = require('./config.json');

const bot = new Twit({
    consumer_key: config.consumer_key,
    consumer_secret: config.consumer_secret,
    access_token: config.access_token,
    access_token_secret: config.access_token_secret
});

let connection;
connection = mysql.createConnection({
    host: config.sql_host,
    user: config.sql_user,
    password: config.sql_pass,
    database: config.sql_db
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

stream.on('tweet', tweetEvent);
searchTweets();


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

function searchTweets() {
    console.info('Checking for more tweets...');

    let TWITTER_SEARCH_PHRASE = '#hate OR #controversial OR #harrasement';

    let query = {q: TWITTER_SEARCH_PHRASE, result_type: "recent"};

    bot.get('search/tweets', query, (err, data, response) => {
        if (err) {
            console.error(`Bot couldn't find any tweets, Error: ${err.stack}`)
            return;
        }

        //console.log(data.statuses[0])
        data.statuses.forEach(status => {
            if (status.lang === 'en') {
                saveToDb(status);
            }
        });
    })
}

function saveToDb(tweet) {
    checkIsInDb(tweet, (result) => {
        if (!result) {

            connection.query('INSERT INTO RyzerTweets (tweet, RTs, Favourites, tweetId) VALUES (' + connection.escape(cleanTweet(tweet.text)) + ', ' + tweet.retweet_count + ', ' + tweet.favorite_count + ', ' + tweet.id + ')', function (err, rows, fields) {

                if (err) {
                    console.error(err.stack)
                }
            });
        }
    })
}

/**
 * Checks to see if a tweet has already been stored in the database
 * @param tweet
 * @param callback
 */
function checkIsInDb(tweet, callback) {
    connection.query(`SELECT distinct 1 FROM RyzerTweets WHERE RyzerTweets.tweetId = ${tweet.id};`, function (err, result) {
        if (err) {
            console.error(err.stack)
        }
        let length = result.length;

        if (length > 0) callback(true);
        else callback(false);
    });
}


function cleanTweet(tweetText) {
    const urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return tweetText.replace("RT ", "").replace("RT", "").replace(urlRegex, "");
}

setInterval(searchTweets, 1800000);