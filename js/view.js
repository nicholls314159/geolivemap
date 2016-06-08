/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *  @author:  Stephen Nicholls, June 5, 2016
 */
 
//  Define Constants 
var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var API_ACCESS_KEY = 'AIzaSyB7NeHBXPQlmR1i4rgFw2zSbIqyXpCXaUw';

//Regex for URLs
var URL_REGEX = /(?:https?|ftp):\/\/[\n\S]+/g;

//inputObject contains all the inputs from the User
var viewObject = {};

//Retrieve the domain from the existing URL, to construct the new URL
var startURL = '';

//URL from Google Shortening service for Facebook and Tweeter
var shortURL = '';

/**   This function initializes page and calls functions to load APIs
  */
$(document).ready(function() {
  $.getScript('https://apis.google.com/js/client.js?onload=handleClientLoad');
});

/**  This function sets the API key, instantiates the APIs, and makes calls to pull relevant data
 */ 
function handleClientLoad() {
  gapi.client.setApiKey(API_ACCESS_KEY); 
  gapi.client.load('urlshortener', 'v1',function(){});
  gapi.client.load('youtube', 'v3', function() {
     loadParamsFromURL();
     generateVideoViewer();
     pullVideoMetaData();
  });
}

/**  This function loads parameters from a URL into the input object
 */
function loadParamsFromURL() {
  //retrieve URL from browser window
  startURL = window.location.href;
  
  //If the URL does not contain search parameters to parse skip to end of function
  if (startURL && startURL.indexOf('?v=') > 0) {
    //create an array of parameters parsed from URL
    console.log('cutting up start url '+startURL.slice(startURL.indexOf('?v=') + 1));
    var paramListCollection = startURL.slice(startURL.indexOf('?v=') + 1).split("&");

    //define the urlParams array
    var urlParams = {};
    for (var i = 0; i < paramListCollection.length; i++) {
      //parse the individual parameters and values into a temporary array
      console.log('paramListCollection['+i+'] is '+ paramListCollection[i] + '.');
      var individualParamCollection = paramListCollection[i].split("=");
      console.log('individualParamCollection[0] is '+individualParamCollection[0]+'.');
      console.log('individualParamCollection[1] is '+individualParamCollection[1]+'.');

      //store the URL parameter/value pairs into the urlParams array
      urlParams[individualParamCollection[0]] = individualParamCollection[1];
    }
  }
  //start loading inputObject from the URL parameters
  viewObject.inputVideoID = urlParams['v'];
}

/**  This function generates the video viewer where the livestream will autoplay
 */ 
function generateVideoViewer(){
    var div = $('<div>');
    div.addClass('videoPlayer');
    var embeddedVideoPlayer = $('<iframe width="700" height="393" src="https://www.youtube.com/embed/'
    +viewObject.inputVideoID+'?autoplay=1" frameborder="0" allowfullscreen ></iframe>');	
    $('#videoPlayer').append(embeddedVideoPlayer);
}

/**  This function pulls in the metadata about the video (Note this comes from an API pull using the
 *   video ID (rather than being pulled from the URL of the previous page))
 */ 
function pullVideoMetaData(){
   //generate request object for video search
   var videoIDRequest = gapi.client.youtube.videos.list({
     id: viewObject.inputVideoID,
     part: 'id,snippet,recordingDetails,liveStreamingDetails',
     key: API_ACCESS_KEY
   });

   //execute request and process the response object to pull in latitude and longitude
   videoIDRequest.execute(function(response) {
    if ('error' in response || !response) {
      showConnectivityError();
    } else {
     $.each(response.items, function(index, item) {
      viewObject.title = item.snippet.title;
      viewObject.channelID = item.snippet.channelId;
      viewObject.channel = item.snippet.channelTitle;
      viewObject.thumbnailURL = item.snippet.thumbnails.default.url;
      viewObject.description = item.snippet.description;

      viewObject.displayTimeStamp = getDisplayTimeFromTimeStamp(item.snippet.publishedAt);
      viewObject.publishTimeStamp = item.snippet.publishedAt;

      if(item.liveStreamingDetails && item.liveStreamingDetails.concurrentViewers){
        viewObject.concurrentViewers = item.liveStreamingDetails.concurrentViewers;
        viewObject.scheduledStartTime = item.liveStreamingDetails.scheduledStartTime;
        viewObject.actualStartTime = item.liveStreamingDetails.actualStartTime;
      }else{
        viewObject.concurrentViewers = 'NA';
        viewObject.scheduledStartTime = 'NA';
        viewObject.actualStartTime = 'NA'
      }
     });
    }
    //reset startURL with the latest
    startURL = window.location.href;
    var requestShortener = gapi.client.urlshortener.url.insert({
      'resource': {
         'longUrl': startURL
       }
    });
    requestShortener.execute(function(responseShortener){
      if(responseShortener.id != null){
        shortURL = responseShortener.id;
      }            
      populateVideoMetaData();
    });
  });
}
/**  This function create the HTML used to display the video meta data
 */ 
function populateVideoMetaData(){
    var div2 = $('<div>');
    div2.addClass('videoview-container');

    var tableOfVideoViewContent_div = $('<div>');
    tableOfVideoViewContent_div.addClass('tableOfVideoViewContentResults');

    var tableDefinition = $('<table>');
    tableDefinition.attr('width', '500');
    tableDefinition.attr('cellpadding', '5');
    
    //if channel name is blank then use channel ID 
    if (!viewObject.channel) {
      viewObject.channel = viewObject.channelID;
    }
    //var resultRow_RIGHT = $('<tr>');
    var resultRow = $('<tr>');
    var imageCell = $('<td width=100 align=left>');
    var metaDataCell = $('<td width=300 valign=top align=left>');
    var socialCell = $('<td width=100 align=right valign=top>');

    //format image section
    var imageString = "<img src='" + viewObject.thumbnailURL + "' height='100' width='100'/>";
    imageCell.append(imageString);

    //format meta-data section
    var videoString = $("<attr title='Description: " + viewObject.description + "'><a href=" + 
    startURL + ">" + viewObject.title + "</a></attr><br>");
    
    var truncatedVideoDescription = "";
    //if description is non null, truncate it and remove any hard coded URLs
    if(viewObject.description){
      truncatedVideoDescription = replaceHardCodedURLs(viewObject.description.substring(0,300));
    }
    var actualStartTime = "";
    if(actualStartTime){
      actualStartTime = getDisplayTimeFromTimeStamp(viewObject.actualStartTime);
    }
    
    var videoDesc = "Description: " + truncatedVideoDescription + "...<br>";
    //var channelString = "Channel:  <attr title='Click to go to uploader's Channel'><a href='https://www.youtube.com/channel/" + viewObject.channelID + "' target='_blank'>" + viewObject.channel + "</a></attr><br>";
    var concurrentUsersString = "Concurrent Users: "+viewObject.concurrentViewers+"<br>"
    var startTimeString = "Actual Start Time:  "+ actualStartTime +"<br>"
   
   //if its the first time the page has been loaded and short url is not available
   //then provided vanity URL for Facebook and Twitter links
   if((startURL.includes('?authuser=0')) && (shortURL.length < 2))
   {
        shortURL = "http://www.geosearchtool.com"
   }

    var facebookFunction = '<div id="fb-root"></div><script>(function(d, s, id) { var js, fjs = d.getElementsByTagName(s)[0]; if (d.getElementById(id)) return; js = d.createElement(s); js.id = id; js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.6"; fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));</script>'
    var facebookLink = '<div class="fb-share-button" data-href="'+shortURL+'" data-layout="button" data-mobile-iframe="true"></div>'
    var twitterLink = '<a href="https://twitter.com/share" class="twitter-share-button" data-url="'+shortURL+'" data-text="Check out this video!!!" data-hashtags="geosearchtool">Tweet</a>'
    var twitterFunction = "<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>"

    socialCell.append('<br><br>');
    socialCell.append(facebookFunction);
    socialCell.append(facebookLink);
    socialCell.append('<br><br>');
    socialCell.append(twitterLink);
    socialCell.append(twitterFunction);
    metaDataCell.append(videoString);
    metaDataCell.append(videoDesc);
    metaDataCell.append(concurrentUsersString);
    metaDataCell.append(startTimeString);
    
    resultRow.append(imageCell);
    resultRow.append(metaDataCell);
    resultRow.append(socialCell);
    
    tableDefinition.append(resultRow);

    //show results in a table on UI
    tableOfVideoViewContent_div.append(tableDefinition);
    $('#tableOfVideoViewContentResults').append(tableOfVideoViewContent_div);

    //ensure table is nested in 'video-container' div for proper formatting
    div2.append(tableOfVideoViewContent_div);
    $('#videoview-container').append(div2);
}

function hideErrorContainer() {
  $("#showErrorsContainer").hide();
}

/**  This function displays a connectivity error to the end user in the event
 *  that we lose connectivity to one or more of the Google APIs
 */
function showConnectivityError() {
  var div3 = $('<div>');
  div3.addClass('showErrors');
  div3.append("Error connecting to Google APIs");

  $('#showErrorsContainer').empty();
  $('#showErrorsContainer').append(div);
  showErrorSection();
}

function showErrorSection() {
  $("#showErrors").show();
}
/** This function takes the time format from the response and changes it into a more readable format.
 */ 
function getDisplayTimeFromTimeStamp(timeStamp){
    var displayTime = "";
    var year = timeStamp.substr(0, 4);
    var monthNumeric = timeStamp.substr(5, 2);
    var monthInt = 0;

    if (monthNumeric.indexOf("0") === 0) {
      monthInt = monthNumeric.substr(1, 1);
    } else {
      monthInt = monthNumeric;
    }
    var day = timeStamp.substr(8, 2);
    var time = timeStamp.substr(11, 8);
    var monthString = MONTH_NAMES[monthInt - 1];

    displayTime = monthString + " " + day + ", " + year + " - " + time + " UTC";
    return displayTime;
}

/** This function removes hardcoded URLs from a string (e.g. this throws off the formatting if the description has a long
 * URL in it).
 */ 
function replaceHardCodedURLs(rawString){
 return rawString.replace(URL_REGEX, '');
}

/** This method handle search button clicks.   It pulls data from the web
 * form into the inputObject and then calls the search function.
 */
function clickedSearchButton() {
   var dref = document.referrer
   if( dref.includes('/?q=') ){
      window.history.back();
   }else{
      window.location = "http://www.geosearchtool.com"
   }
}
