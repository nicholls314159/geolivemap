/**
 * Copyright 2014 Google Inc. All rights reserved.
 *
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
 *  @fileoverview  This code is an example implementation of how to implement YouTube geo-search
 *  and search filters via established APIs.  The application itself is directed toward the use
 *  case of journalists trying to discover citizen journalism on YouTube.   It integrates with the Google Maps API to plot
 *  the upload location of geo-tagged video results.
 *  @author:  Stephen Nicholls, March 10, 2014
 */


//Define a Global variables

//validationErrors flag is set if errors are found on the input object
var validationErrors = false;

//finalResults stores the search results from the API search
var finalResults = [];

//finalResults2 stores the final results 
var finalResults2 = [];

//inputObject contains all the inputs from the User
var inputObject = {};

//geocoder is a geocoder object used for mapping functions
var geocoder;

//publishAfterTime and publishBeforeTime define the before and after times to submit for the search
var publishAfterTime = '';
var publishBeforeTime = '';

//queryFromClickSearchNotURL is a flag which indicates if the search originated from a clicked search button or from loading the parameters from the URL
var queryFromClickSearchNotURL = false;

/** INITIAL_ZOOM_LEVEL is the zoom level that is set as default when our map is created
 *  @const {string}
 */
var INITIAL_ZOOM_LEVEL = 3;
var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var API_ACCESS_KEY = 'AIzaSyDDfLx0QQzLeDWaIIAJKAsp-6cSUe6vvhk';

var CAR_REGEX = /\d{4} (?:dodge|chevy|ford|toyota|bmw|mercedes|honda|chrysler|pontiac|hyundai|audi|jeep|scion|cadillac|volks|acura|lexus|suburu|nissan|mazda|suzuki|buick|gmc|chevrolet|lincoln|infiniti|mini|hummer|porsche|volvo|land|kia|saturn|mitsubishi)/i;
var HOME_FOR_SALE_REGEX = /home for sale/i
var MLS_NUMB_REGEX = /MLS#/i
var REAL_ESTATE_REGEX = /real estate/i
var REALTY_REGEX = /realty/i

//(?:'home for sale'|'real estate'|'realty')

//Current page URL for access params
var startURL = '';

//URL generated from Google Shortener service, for use in tweets and FB posts
var shortURL = '';


/** Initialize portions of page on page load and create object with all News channels in it
 */
$(document).ready(function() {
  hideSearchFilters();
  resetResultsSection();
  displayCustomRangeSection();
  $.getScript('https://apis.google.com/js/client.js?onload=handleClientLoad');
});

function handleClientLoad() {
  gapi.client.load('youtube', 'v3', function() {
    $.getScript('https://maps.googleapis.com/maps/api/js?sensor=false&callback=handleMapsLoad&key=' + API_ACCESS_KEY);
    gapi.client.setApiKey(API_ACCESS_KEY); 
    gapi.client.load('urlshortener', 'v1',function(){});
  });
}


function handleMapsLoad() {
  geocoder = new google.maps.Geocoder();
  $('#search-button').attr('disabled', false);
  
  startURL = window.location.href;
  console.log("TTT1")
  
  //If the URL does not contain search parameters to parse skip to end of function
  if (!startURL.includes('?q=')) {
    //if no default params in the URL then set those and reload page.
    console.log("TTT2 generateInitialURLwithQueryParameters "+ generateInitialURLwithQueryParameters())
     window.location = generateInitialURLwithQueryParameters();
  }
  console.log("TTT3")
  loadParamsFromURL();

}


/**
 * This function generates the FB and Twitter buttons and embeds them in the HTML
 */
function loadSocialLinks(){
  //console.log("loadSocialLinks() ...start");
  //remove any old results
  $('#socialCell').empty();
  
   //if its the first time the page has been loaded and short url is not available
   //then provided vanity URL for Facebook and Twitter links
   startURL = window.location.href;
   if((startURL.includes('?authuser=0')) && (shortURL.length < 2))
   {
        shortURL = "http://www.geosearchtool.com"
   }
   //console.log("shortURL " + shortURL);
   var social_div = '';
   social_div = $('<div>');
   social_div.addClass('socialCell');  

  var socialTableDefinition = $('<table>');
  var socialRow = $('<tr>');
   
   var socialCell = $('<td>');
   var facebookFunction = '<div id="fb-root"></div><script>(function(d, s, id) { var js, fjs = d.getElementsByTagName(s)[0]; if (d.getElementById(id)) return; js = d.createElement(s); js.id = id; js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.6"; fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));</script>'
   var facebookLink = '<div class="fb-share-button" data-href="'+shortURL+'" data-layout="button_count" data-mobile-iframe="true"></div>'
   var twitterLink = '<a href="https://twitter.com/share" class="twitter-share-button" data-url="'+shortURL+'" data-text="Check out this video!!!" data-hashtags="geosearchtool">Tweet</a>'
   var twitterFunction = "<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>"
    
  console.log("facebookLink is "+facebookLink);
  console.log("twitterLink is "+twitterLink);
  
   socialCell.append(facebookFunction);
   //('body').append(facebookFunction);
   socialCell.append(facebookLink);
   socialCell.append('&nbsp;&nbsp;&nbsp;');
   socialCell.append(twitterLink);
   socialCell.append(twitterFunction);
   //('body').append(twitterFunction);
   
   socialRow.append(socialCell);
   socialTableDefinition.append(socialRow);
   social_div.append(socialTableDefinition);
   $('#socialCell').append(social_div);
   
   console.log("loadSocialLinks() ...end");
}

/**
 *  This function clears results from the UI, routes location searches to getLocationSearchResults(),
 *  generates a request object, from the inputObject for non-location searches and
 *  passes the request to processYouTubeRequest()
 */
function searchYouTube() {
  console.log("searchYouTube() 1")
  //Reset errors section, final results array and results section
  $(".showErrors").remove();
  resetResultsSection();
  finalResults = [];
  finalResults2 = [];

  //remove any old results
  $("div").remove(".tableOfVideoContentResults");
  

  //if this is a location search, route to getLocationSearchResults to conduct
  //geo-encoding and complete search
  if (inputObject.hasSearchLocation) {
    getLocationSearchResults();
  } else {
    //if inputObject has multiple channels then do a search on each one
    //and aggregate the results
/*
    if (inputObject.hasChannelList) {
      //split list by channel
      var channelArray = inputObject.inputChannelList.split(",")
      for (var i = 0; i < channelArray.length; i++) {
        inputObject.currentChannel = channelArray[i].trim();
        
        //for searches on just live videos only
        if (inputObject.inputLiveOnly) {
          console.log("YYYY Searching:  No Location, Specific Channel(s), Live Only")
          getPublishBeforeAndAfterTime();
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              //order: "date",
              order: "viewCount",
              type: 'video',
              part: 'snippet',
              maxResults: '50',
              eventType: 'live',
              videoLiscense: inputObject.videoLiscense,
              videoEmbeddable: inputObject.videoEmbeddable,
              channelId: inputObject.currentChannel,
              publishedAfter: publishAfterTime,
              publishedBefore: publishBeforeTime,
              key: API_ACCESS_KEY
            });
          } catch (err) {
            //cannot search via the YouTube API, update end-user with error message
            showConnectivityError();
          }
        } else {
          //console.log("Searching:  No Location, Specific Channel(s), Live and VOD")
          getPublishBeforeAndAfterTime();
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              order: "date",
              type: 'video',
              part: 'snippet',
              maxResults: '50',
              videoLiscense: inputObject.videoLiscense,
              videoEmbeddable: inputObject.videoEmbeddable,
              channelId: inputObject.currentChannel,
              publishedAfter: publishAfterTime,
              publishedBefore: publishBeforeTime,
              key: API_ACCESS_KEY
            });
          } catch (err) {
            //cannot search via the YouTube API, update end-user with error message
            showConnectivityError();
          }
        }
        //Call processYouTubeRequest to process the request object
        processYouTubeRequest(request);
      }
    } else {
*/    
      //for searches on just live videos only
      if (inputObject.inputLiveOnly) {
        console.log("YYYY Searching:  No Location, No Specific Channel, Live Only")
        getPublishBeforeAndAfterTime();
        try {
          var request = gapi.client.youtube.search.list({
            q: inputObject.inputQuery,
            //order: "date",
            order: "viewCount",
            type: 'video',
            part: "id,snippet",
            maxResults: '50',
            eventType: 'live',
            videoLiscense: inputObject.videoLiscense,
            videoEmbeddable: inputObject.videoEmbeddable,
            publishedAfter: publishAfterTime,
            publishedBefore: publishBeforeTime,
            key: API_ACCESS_KEY
          });
        } catch (err) {
          //cannot search via the YouTube API, update end-user with error message
          showConnectivityError();
        }
      } else {
        console.log("Searching:  No Location, No Specific Channel, Live and VOD")
        printInputObject();
        getPublishBeforeAndAfterTime();
        try {
          var request = gapi.client.youtube.search.list({
            q: inputObject.inputQuery,
            order: "date",
            type: 'video',
            part: "id,snippet",
            maxResults: '50',
            videoLiscense: inputObject.videoLiscense,
            videoEmbeddable: inputObject.videoEmbeddable,
            publishedAfter: publishAfterTime,
            publishedBefore: publishBeforeTime,
            key: API_ACCESS_KEY
          });
        } catch (err) {
          //cannot search via the YouTube API, update end-user with error message
          showConnectivityError();
        }
      }
      //Call processYouTubeRequest to process the request object
      processYouTubeRequest(request);
    //}
  }
}

//need to clean out hard coded spaces from url params e.g. "new%20york" should be "new york"
function cleanStringOfHTMLEncodedSpaces(raw_string){
  if (typeof(raw_string) != "undefined"){
      return raw_string.replace("%20", " ");
  }else{
    return raw_string;
  }
}

/**  This function loads parameters from a URL into the input object
 */
function loadParamsFromURL() {
  startURL = window.location.href;

  //reset the input object to remove any old data
  cleanInputObject();

  //If the URL does not contain search parameters to parse skip to end of function
  if (startURL && startURL.indexOf('?q=') > 0) {
    //create an array of parameters parsed from URL
    var paramListCollection = startURL.slice(startURL.indexOf('?q=') + 1).split("&");

    //define the urlParams array
    var urlParams = {};
    for (var i = 0; i < paramListCollection.length; i++) {
      //parse the individual parameters and values into a temporary array
      var individualParamCollection = paramListCollection[i].split("=");

      //store the URL parameter/value pairs into the urlParams array
      urlParams[individualParamCollection[0]] = individualParamCollection[1];
    }


    //start loading inputObject from the URL parameters
    inputObject.inputQuery = cleanStringOfHTMLEncodedSpaces(urlParams['q']);
    inputObject.inputLat = cleanStringOfHTMLEncodedSpaces(urlParams['la']);
    inputObject.inputLong = cleanStringOfHTMLEncodedSpaces(urlParams['lo']);
    inputObject.inputLocationRadius = cleanStringOfHTMLEncodedSpaces(urlParams['lr']);
    inputObject.inputTimeWindow = cleanStringOfHTMLEncodedSpaces(urlParams['tw']);
    inputObject.inputStartDate = cleanStringOfHTMLEncodedSpaces(urlParams['sd']);
    inputObject.inputEndDate = cleanStringOfHTMLEncodedSpaces(urlParams['ed']);
    inputObject.inputChannelList = cleanStringOfHTMLEncodedSpaces(urlParams['cl']);
    inputObject.inputSearchLocation = cleanStringOfHTMLEncodedSpaces(urlParams['sl']);
    inputObject.inputNewsChannelFilter = cleanStringOfHTMLEncodedSpaces(urlParams['ncf']);
    inputObject.inputZoomLevel = cleanStringOfHTMLEncodedSpaces(urlParams['zl']);
    publishBeforeTime = cleanStringOfHTMLEncodedSpaces(urlParams['pbt']);

    inputObject.inputEmbedsOnly = urlParams['eo'];
    if (urlParams["eo"] === "true") {
      inputObject.inputEmbedsOnly = true;
    } else {
      inputObject.inputEmbedsOnly = false;
    }
    inputObject.inputLiveOnly = urlParams["loo"];
    if (urlParams["loo"] === "true") {
      inputObject.inputLiveOnly = true;
    } else {
      inputObject.inputLiveOnly = false;
    }
    inputObject.inputCreativeCommonsOnly = urlParams["cco"];
    if (urlParams["cco"] === "true") {
      inputObject.inputCreativeCommonsOnly = true;
    } else {
      inputObject.inputCreativeCommonsOnly = false;
    }

    //if this a blank query, do not conduct a search
    if (inputObject.inputQuery || inputObject.inputLat || inputObject.inputLong || inputObject.inputChannelList) {
      completeInputObject();

      //search YouTube, if no errors exist
      if (!validationErrors) {
        //indicate that the search was not generated from clicking "search"
        queryFromClickSearchNotURL = false;
        searchYouTube();
      }
    }
  }  
}


/** This method handle search button clicks.   It pulls data from the web
 * form into the inputObject and then calls the search function.
 */
function clickedSearchButton() {
  queryFromClickSearchNotURL = true;
  console.log("clickedSearchButton()")

  //reset the input object to remove any old data
  cleanInputObject();

  //pull web form data into input object
  inputObject.inputQuery = $('#query').val();
  inputObject.inputLat = $('#lattitude').val();
  inputObject.inputLong = $('#longitude').val();
  inputObject.inputLocationRadius = $('#locRadius').val();
  inputObject.inputTimeWindow = $('#timeWindow').val();
  inputObject.inputStartDate = $('#startDate').val();
  inputObject.inputEndDate = $('#endDate').val();
  inputObject.inputChannelList = $('#channelList').val();
  inputObject.inputSearchLocation = $('#searchLocation').val();
  inputObject.inputEmbedsOnly = 'false';
  inputObject.inputLiveOnly = 'false';
  inputObject.inputCreativeCommonsOnly = 'false';
  inputObject.inputEmbedsOnly = $('#embedOnly').is(':checked');
  inputObject.inputLiveOnly = $('#liveOnly').is(':checked');
  inputObject.inputCreativeCommonsOnly = $('#creativeCommonsOnly').is(':checked');
  inputObject.inputZoomLevel = INITIAL_ZOOM_LEVEL;

  //complete input object
  completeInputObject();

  //search YouTube, if there are no validation errors
  if (!validationErrors) {
    //searchYouTube();
    url = generateURLwithQueryParameters();
    window.location = url;
  }
}


/**  This function defines a set of booleans in the inputObject based on other values in the same object.
 */
function completeInputObject() {
  //define booleans for types of filters
  inputObject.hasTimeWindow = false;
  inputObject.hasStartEndDate = false;
  inputObject.hasChannelList = false;
  inputObject.hasSearchLocation = false;
  inputObject.newsChannelsOnly = false;
  inputObject.removeNewsChannel = false;

  if (inputObject.inputSearchLocation && inputObject.inputLocationRadius) {
    inputObject.hasSearchLocation = true;
  }

  // reset validation errors flag
  validationErrors = false;

  //create array to store validation errors
  var validationErrorsArr = [];

  //need to enter start and end date for custom range
  if (inputObject.inputTimeWindow === 'custom_range' && (!inputObject.inputStartDate || !inputObject.inputEndDate)) {
    validationErrorsArr.push("You must enter a start date and end date for a custom range");
    validationErrors = true;
  }


  //define regular expressions for validating input values
  var dateRegEx = new RegExp("[0-1][0-9][-][0-3][0-9][-][2][0][0-1][0-9]");
  var numberRegEx = new RegExp("^[0-9]+")

  //Validate that location and location radius are set to conduct search
  if (inputObject.inputSearchLocation && !inputObject.inputLocationRadius) {
    validationErrorsArr.push("You must have both a location and radius for a location search");
    validationErrors = true;
  }

  if (inputObject.inputTimeWindow === 'custom_range' && inputObject.inputStartDate && !dateRegEx.test(inputObject.inputStartDate)) {
    //start date must be mm-dd-yyyy
    validationErrorsArr.push("Start Date must be format of mm-dd-yyyy");
    validationErrors = true;
  }

  if (inputObject.inputTimeWindow === 'custom_range' && inputObject.inputEndDate && !dateRegEx.test(inputObject.inputEndDate)) {
    //start date must be mm-dd-yyyy
    validationErrorsArr.push("End Date must be format of mm-dd-yyyy");
    validationErrors = true;
  }

  //if errors exist, display them on interface and terminate execution there
  if (validationErrors) {
    var div = $('<div>');
    div.addClass('showErrors');

    for (var i = 0; i < validationErrorsArr.length; i++) {
      div.append(validationErrorsArr[i] + "<br>");
    }

    $('#showErrorsContainer').empty();
    $('#showErrorsContainer').append(div);
    showErrorSection();

    //do not display search results and search result count if validation errors occur
    resetResultsSection();
    $('#searchResultCount').remove();
  } else {

    if (inputObject.inputTimeWindow && inputObject.inputTimeWindow !== 'custom_range') {
      inputObject.hasTimeWindow = true;
    }
    if (inputObject.inputTimeWindow && inputObject.inputTimeWindow === 'custom_range' && inputObject.inputStartDate && inputObject.inputEndDate) {
      inputObject.hasStartEndDate = true;
    }
    if (inputObject.inputChannelList && inputObject.inputChannelList) {
      inputObject.hasChannelList = true;
    }
  }

  inputObject.eventType = '';
  inputObject.videoLiscense = 'any';
  inputObject.videoEmbeddable = 'any';

  if (inputObject.inputCreativeCommonsOnly) {
    inputObject.videoLiscense = 'creativeCommon';
  }

  if (inputObject.inputEmbedsOnly) {
    inputObject.videoEmbeddable = 'true';
  }

}


function generateInitialURLwithQueryParameters(){
  var initialURLParameterString =  "?q=&la=39.18360819999999&lo=-96.57166940000002&lr=500km&tw=any&cl=&sl=manhattan,%20ks&eo=false&loo=true&cco=false&zl=5&pbt=2016-05-20T02:49:50Z";
    //Retrieve the domain from the existing URL, to construct the new URL
  console.log('initialURLParameterString is '+ initialURLParameterString);
 
  var currentURL = String(window.location);

  var newURLArray = [];
  var newURL = '';

  if (currentURL) {
    //split current URL by "?" delimiter.  The first element will be the domain.
    newURLArray = currentURL.split('?');

    //if currentURL does not contain a '?', then it is already just the domain and newURLArray will be undefined
    if (!newURLArray) {
      //concatenate the domain and the parameter string
      newURL = currentURL + initialURLParameterString;
    } else {
      //concatenate the first element of newURLArray (which is the domain) and the parameter string
      newURL = newURLArray[0] + initialURLParameterString;
    }
  }
  console.log('newURL is '+newURL)
  return newURL;

}

/**  This function generates a URL, with all the search parameters, which is then
 *  loaded into the omnibox of the browser.
 *  @returns url {string}
 */
function generateURLwithQueryParameters() {
  parameterString = '';

  //if a custom range was selected in the search include start and end dates in the URL
  if (inputObject.inputTimeWindow === "custom_range") {
    parameterString =
      "?q=" + inputObject.inputQuery + "&la=" + inputObject.inputLat +
      "&lo=" + inputObject.inputLong + "&lr=" + inputObject.inputLocationRadius +
      "&tw=" + inputObject.inputTimeWindow + "&sd=" + inputObject.inputStartDate +
      "&ed=" + inputObject.inputEndDate + "&cl=" + inputObject.inputChannelList +
      "&sl=" + inputObject.inputSearchLocation + "&eo=" + inputObject.inputEmbedsOnly +
      "&loo=" + inputObject.inputLiveOnly + "&cco=" + inputObject.inputCreativeCommonsOnly +
      "&zl=" + inputObject.inputZoomLevel + "&pbt=" + publishBeforeTime;
  } else {
    parameterString =
      "?q=" + inputObject.inputQuery + "&la=" + inputObject.inputLat +
      "&lo=" + inputObject.inputLong + "&lr=" + inputObject.inputLocationRadius +
      "&tw=" + inputObject.inputTimeWindow +
      "&cl=" + inputObject.inputChannelList +
      "&sl=" + inputObject.inputSearchLocation + "&eo=" + inputObject.inputEmbedsOnly +
      "&loo=" + inputObject.inputLiveOnly + "&cco=" + inputObject.inputCreativeCommonsOnly +
      "&zl=" + inputObject.inputZoomLevel + "&pbt=" + publishBeforeTime;
  }

  //Retrieve the domain from the existing URL, to construct the new URL
  var currentURL = String(window.location);

  var newURLArray = [];
  var newURL = '';

  if (currentURL) {
    //split current URL by "?" delimiter.  The first element will be the domain.
    newURLArray = currentURL.split('?');

    //if currentURL does not contain a '?', then it is already just the domain and newURLArray will be undefined
    if (!newURLArray) {
      //concatenate the domain and the parameter string
      newURL = currentURL + parameterString;
    } else {
      //concatenate the first element of newURLArray (which is the domain) and the parameter string
      newURL = newURLArray[0] + parameterString;
    }
  }

  return newURL;
}

 



/**  This function handles the display of the search result count
 */
function updateSearchResultCount(count) {
  var resultString;
  //if no results were found, provide some ideas on improving the query to the end-user
  if (count === 0) {
    resultString = "No results found.  Try expanding the location radius, time frame, or just leaving the location and radius fields blank and doing a keyword search.";
  } else {
    resultString = "Found " + count + " results.";
  }

  //clear the old search results count and add the updated one
  $('#searchResultCount').remove();
  $('#searchResultCountContainer').append('<div id="searchResultCount">' + resultString + '</div>');
}

/**  This function takes a request object, executes the request, and uses a callback function parse the response
 *  into a results array.
 *  @param request {object} - this is the request object returned from the YouTube search API
 */
function processYouTubeRequest(request) {
  console.log("start processYouTubeRequest()")
  request.execute(function(response) {
    var resultsArr = [];
    var videoIDString = '';
    if(!response){
      console.log("response is null!!")
    }
    //if the result object from the response is null, show error; if its empty, remove old results and display
    //message on how to broaden search to get more results.
    if ('error' in response || !response) {
      console.log('error retrieving data');
      console.log('Yo Yo' +response.error.message);
      console.log('Yo Yo' +response.error.code);
      if(!response.error.errors){
        var errArray = response.error.errors;
        for(var j=0; j<errArray.length; j++){
          console.log("errArray"+j+" is "+errArray[j].message);
        }
      }
      showConnectivityError();
    } else if (!response.result || !response.result.items) {
      updateSearchResultCount(0);
      resetResultsSection();
      $("div").remove(".tableOfVideoContentResults");
    } else {
      console.log("No Yo Yo:  got search response");
      var entryArr = response.result.items;
///// TEST /////  
      //var resultArrayLength =  entryArr.length
      //var loopCounter = 0;
      //var isFinishedWithLookup = false;
      //console.log("resultArrayLength is "+ resultArrayLength)
      entryArr.forEach(function(listItem, index){
          var videoResult = new Object();
          videoResult.title = listItem.snippet.title;
          videoResult.videoID = listItem.id.videoId;
          videoIDString = videoIDString + videoResult.videoId + ",";
          console.log("44444 about to create request.  videoResult.videoID is "+videoResult.videoID)
          //while(!isFinishedWithLookup){
            try {
              var requestLiveStream = gapi.client.youtube.videos.list({
                id: videoResult.videoID,
                part: "liveStreamingDetails",
                key: API_ACCESS_KEY
              });
            } catch (err) {
              //cannot search via the YouTube API, update end-user with error message
              showConnectivityError();
            }          
            console.log('44444 request created')
            requestLiveStream.execute(function(responseLiveStream) {
              if ('error' in responseLiveStream || !responseLiveStream) {
                console.log('44444 error retrieving data for responseLiveStream');
              }else{
                console.log('4444 got liveStreamDetails')
                var liveStreamEntryArr = responseLiveStream.result.items;
                console.log('4444 got liveStreamEntryArr.length is '+liveStreamEntryArr.length)
                for (var i = 0; i < liveStreamEntryArr.length; i++) {
                    console.log("liveStreamEntryArr[i].liveStreamingDetails is "+liveStreamEntryArr[i].liveStreamingDetails)
                    if (typeof liveStreamEntryArr[i].liveStreamingDetails.concurrentViewers == undefined){
                      videoResult.concurrentUsers = 'undefined'
                      console.log("huzzah!!! videoResult.concurrentUsers is undefined");
                    }else{ 
                      videoResult.concurrentUsers = liveStreamEntryArr[i].liveStreamingDetails.concurrentViewers
                      console.log("huzzah!!! videoResult.concurrentUsers is "+ videoResult.concurrentUsers + " for i="+i);
                    }
                    if (typeof liveStreamEntryArr[i].liveStreamingDetails.actualStartTime == undefined){
                      videoResult.liveStreamStartTime = 'undefined'
                    }else{ 
                      videoResult.liveStreamStartTime = liveStreamEntryArr[i].liveStreamingDetails.actualStartTime
                    }
                }
              }
              console.log("4444 about to doSomething")
              //resultsArr = doSomething(resultsArr,videoResult)
              console.log("4444 did doSomething")
              //doCallback()
              //resultsArr.push(videoResult);
              console.log("4444 pushing videoResult")

            }, doSomething); 
            //console.log('4444 end liveStreamDetails retrieve ')
          //} //end while 
          //isFinishedWithLookup = false;
          //doCallBack(doneies, doOtherStuff())
          console.log("about to do other stuff")
          //doOtherStuff(videoIDString,resultsArr);
          console.log("done with doOtherStuff")
          
      },doOtherStuff);
      
//// END TEST ////     
      console.log('4444 end of test')
/*      
      for (var i = 0; i < entryArr.length; i++) {
        var videoResult = new Object();
        //console.log("videoResult.title is "+videoResult.title);
        videoResult.title = entryArr[i].snippet.title;

        //Pull the lattitude and longitude data per search result
        if ((inputObject.hasSearchLocation) && entryArr[i].georss$where) {
          var latlong = entryArr[i].georss$where.gml$Point.gml$pos.$t;
          var latlongArr = latlong.split(' ');
          videoResult.lat = latlongArr[0].trim();
          videoResult.long = latlongArr[1].trim();
        }

        videoResult.videoId = entryArr[i].id.videoId;
        videoIDString = videoIDString + videoResult.videoId + ",";

        videoResult.url = "https://www.youtube.com/watch?v=" + videoResult.videoId;
        
        
        videoResult.videoID = videoResult.videoId;
        videoResult.channelID = entryArr[i].snippet.channelId;
        videoResult.channel = entryArr[i].snippet.channelTitle;
        videoResult.liveBroadcastContent = entryArr[i].snippet.liveBroadcastContent;
        
        //new to video results
        videoResult.defaultLanguage = entryArr[i].snippet.defaultLanguage
        console.log("huzzah!!! defaultLanguage is "+ videoResult.defaultLanguage)
        
        //dosomething();
*/
//////////////////////////// NOW FOR EACH RESULT, retrieve liveStreamingDetails
/*        console.log("about to create request.  videoResult.videoID is "+videoResult.videoID)
        try {
          var requestLiveStream = gapi.client.youtube.search.list({
            id: videoResult.videoID,
            type: 'video',
            part: "liveStreamingDetails",
            maxResults: '1',
            key: API_ACCESS_KEY
          });
        } catch (err) {
          //cannot search via the YouTube API, update end-user with error message
          showConnectivityError();
        }
        requestLiveStream.execute(function(responseLiveStream) {
            if ('error' in responseLiveStream || !responseLiveStream) {
              console.log('error retrieving data for responseLiveStream');
            }else{
              var liveStreamEntryArr = response.result.items;
              for (var i = 0; i < liveStreamEntryArr.length; i++) {
                 videoResult.concurrentUsers = liveStreamEntryArr[i].liveStreamingDetails.concurrentViewers
                  console.log("huzzah!!! videoResult.concurrentUsers is "+ videoResult.concurrentUsers + " for i="+i);
                 videoResult.liveStreamStartTime = liveStreamEntryArr[i].liveStreamingDetails.actualStartTime
              }
            }
            
            ///insert remain videoResult code here
            videoResult.geoLiveURL = "https://www.youtube.com/watch?v=" + videoResult.videoId;
            console.log("huzzah!!! videoResult.concurrentUsers is "+ videoResult.concurrentUsers)
*/ 
/*
             videoResult.geoLiveURL = "https://www.youtube.com/watch?v=" + videoResult.videoId;
             videoResult.thumbNailURL = entryArr[i].snippet.thumbnails.default.url;
        
             videoResult.description = entryArr[i].snippet.description;

             var year = entryArr[i].snippet.publishedAt.substr(0, 4);
             var monthNumeric = entryArr[i].snippet.publishedAt.substr(5, 2);
             var monthInt = 0;

             if (monthNumeric.indexOf("0") === 0) {
                monthInt = monthNumeric.substr(1, 1);
             } else {
                monthInt = monthNumeric;
             }
             var day = entryArr[i].snippet.publishedAt.substr(8, 2);
             var time = entryArr[i].snippet.publishedAt.substr(11, 8);

             var monthString = MONTH_NAMES[monthInt - 1];

             videoResult.displayTimeStamp = monthString + " " + day + ", " + year + " - " + time + " UTC";
             videoResult.publishTimeStamp = entryArr[i].snippet.publishedAt;
        //});

           resultsArr.push(videoResult);
      }
*/
      //Now we will use the string of video IDs from the search to do another API call to pull latitude
      //and longitude values for each search result

      //remove trailing comma from the string of video ids
/********** testo
          var videoIDStringFinal = videoIDString.substring(0, videoIDString.length - 1);

      //generate request object for video search
          var videoIDRequest = gapi.client.youtube.videos.list({
            id: videoIDStringFinal,
            part: 'id,snippet,recordingDetails',
            key: API_ACCESS_KEY
          });

      //execute request and process the response object to pull in latitude and longitude
          videoIDRequest.execute(function(response) {
            if ('error' in response || !response) {
              showConnectivityError();
            } else {
             //iterate through the response items and execute a callback function for each
              $.each(response.items, function() {
               var videoRequestVideoId = this.id;

                //ensure recordingDetails and recordingDetails.location are not null or blank
                if (this.recordingDetails && this.recordingDetails.location) {
                  //for every search result in resultArr, pull in the latitude and longitude from the response
                  for (var i = 0; i < resultsArr.length; i++) {
                    if (resultsArr[i].videoId === videoRequestVideoId) {
                      resultsArr[i].lat = this.recordingDetails.location.latitude;
                      resultsArr[i].long = this.recordingDetails.location.longitude;
                     break;
                   }
                 }
               }
             });
            }

            //remove duplicates from global results list
            for (var i = 0; i < resultsArr.length; i++) {
              var addResult = true;
              for (var j = 0; j < finalResults.length; j++) {
               if (resultsArr[i].url === finalResults[j].url) {
                 //it is a duplicate, do not add to final results and break inner loop
                 addResult = false;
                 break;
               }
              }
              if (addResult) {
                finalResults.push(resultsArr[i]);
             }
            }

            if (finalResults.length === 0) {
             //No Search Results to Display
             //remove results section as there is nothing to display
             resetResultsSection();
             $("div").remove(".tableOfVideoContentResults");
            } else {
              //show results section
              showResultsSection();

              //remove any old results
             $("div").remove(".tableOfVideoContentResults");

             //generate result list and map of videos
             generateResultList();
              initializeMap(inputObject.inputLat, inputObject.inputLong);
            }
         });
        }
        //Update the URL bar with the search parameters from the search
        window.history.pushState("updatingURLwithParams", "YT Geo Search Tool", generateURLwithQueryParameters());


        //reset startURL with the latest
       startURL = window.location.href;
        var requestShortener = gapi.client.urlshortener.url.insert({
          'resource': {
              'longUrl': startURL
         }
       });
        requestShortener.execute(function(response2) 
        {
           if(response2.id != null)
           {
             shortURL = response2.id;
             //console.log('22 shortURL is'+shortURL);
           }else{
             //console.log("error: creating short url");
            }
       });
       console.log('end processYouTubeRequest()')
      });
   // });
  //}
**********  TESTO
*/  
}

function doSomething(){
  console.log("44444 DOING SOMETHING")
  resultsArr.push(videoResult);
}

function doOtherStuff(){
        console.log("44444 DOING OTHER STUFF")
        //remove trailing comma from the string of video ids
          var videoIDStringFinal = videoIDString.substring(0, videoIDString.length - 1);

      //generate request object for video search
          var videoIDRequest = gapi.client.youtube.videos.list({
            id: videoIDStringFinal,
            part: 'id,snippet,recordingDetails',
            key: API_ACCESS_KEY
          });

      //execute request and process the response object to pull in latitude and longitude
          videoIDRequest.execute(function(response) {
            if ('error' in response || !response) {
              showConnectivityError();
            } else {
             //iterate through the response items and execute a callback function for each
              $.each(response.items, function() {
               var videoRequestVideoId = this.id;

                //ensure recordingDetails and recordingDetails.location are not null or blank
                if (this.recordingDetails && this.recordingDetails.location) {
                  //for every search result in resultArr, pull in the latitude and longitude from the response
                  for (var i = 0; i < resultsArr.length; i++) {
                    if (resultsArr[i].videoId === videoRequestVideoId) {
                      resultsArr[i].lat = this.recordingDetails.location.latitude;
                      resultsArr[i].long = this.recordingDetails.location.longitude;
                     break;
                   }
                 }
               }
             });
            }

            //remove duplicates from global results list
            for (var i = 0; i < resultsArr.length; i++) {
              var addResult = true;
              for (var j = 0; j < finalResults.length; j++) {
               if (resultsArr[i].url === finalResults[j].url) {
                 //it is a duplicate, do not add to final results and break inner loop
                 addResult = false;
                 break;
               }
              }
              if (addResult) {
                finalResults.push(resultsArr[i]);
             }
            }

            if (finalResults.length === 0) {
             //No Search Results to Display
             //remove results section as there is nothing to display
             resetResultsSection();
             $("div").remove(".tableOfVideoContentResults");
            } else {
              //show results section
              showResultsSection();

              //remove any old results
             $("div").remove(".tableOfVideoContentResults");

             //generate result list and map of videos
             generateResultList();
              initializeMap(inputObject.inputLat, inputObject.inputLong);
            }
         });
        }
        //Update the URL bar with the search parameters from the search
        window.history.pushState("updatingURLwithParams", "YT Geo Search Tool", generateURLwithQueryParameters());


        //reset startURL with the latest
       startURL = window.location.href;
        var requestShortener = gapi.client.urlshortener.url.insert({
          'resource': {
              'longUrl': startURL
         }
       });
        requestShortener.execute(function(response2) 
        {
           if(response2.id != null)
           {
             shortURL = response2.id;
             //console.log('22 shortURL is'+shortURL);
           }else{
             //console.log("error: creating short url");
            }
       });
       console.log('end processYouTubeRequest()')
      });
   // });
  //}

}


/** This function generates the UI of the results section after the search has been processed
 */
function generateResultList() {
  console.log('generateResultList() start')
  var div = $('<div>');
  div.addClass('video-content');

  var tableOfVideoContent_div = $('<div>');
  div.addClass('tableOfVideoContentResults');

  var tableDefinition = $('<table>');
  tableDefinition.attr('width', '500');
  tableDefinition.attr('cellpadding', '5');

  //filter out any irrelevant results
  filterIrrelevantResults();

  //update the search result counter after filter
  updateSearchResultCount(finalResults2.length);

  for (var i = 0; i < finalResults2.length; i++) {
    var channel = finalResults2[i].channel;
    var channelID = finalResults2[i].channelID;
    if (!channel) {
      channel = channelID;
    }

    //each result, will be listed in a row with an image, meta-data and rank sections
    var resultRow = $('<tr>');
    var imageCell = $('<td width=100>');
    var metaDataCell = $('<td width=350 valign=top>');
    var rankCell = $('<td>');

    //format image section
    var imageString = "<img src='" + finalResults2[i].thumbNailURL + "' height='100' width='100'/>";
    imageCell.append(imageString);

    
    //Generate new URL string
    var videoURLString = "/view.html?v="+finalResults2[i].videoID;
    var videoURLStringLong = "http://www.geosearchtool.com"+videoURLString

    var videoString = "<attr title='Description: " + finalResults2[i].description + "'><a href='" + videoURLString + "'>" + finalResults2[i].title + "</a></attr><br>";
    var uploadDate = "Uploaded on: " + finalResults2[i].displayTimeStamp + "<br>";
    var channelString = "Channel:  <attr title='Click to go to uploader's Channel'><a href='https://www.youtube.com/channel/" + channelID + "' target='_blank'>" + channel + "</a></attr><br>";
    var reverseImageString = "<attr title='Use Google Image Search to find images that match the thumbnail image of the video.'><a href='https://www.google.com/searchbyimage?&image_url=" + finalResults2[i].thumbNailURL + "' target='_blank'>reverse image search</a></attr><br>";
    //var concurrentUsers = "Concurrent Users: " + finalResults2[i].concurrentUsers + "<br>";
    var defaultLang = "Default Language is : " + finalResults2[i].defaultLanguage + "<br>";
            //console.log("huzzah!!! defaultLanguage is "+ videoResult.defaultLanguage)
        //console.log("huzzah!!! videoResult.concurrentUsers is "+ videoResult.concurrentUsers)



    metaDataCell.append(videoString);
    metaDataCell.append(uploadDate);
    metaDataCell.append(channelString);
    metaDataCell.append(reverseImageString);
    //metaDataCell.append(concurrentUsers);
    metaDataCell.append(defaultLang);
    //Put all the sections of the row together
    resultRow.append(imageCell);
    resultRow.append(metaDataCell);
    tableDefinition.append(resultRow);
  }
  
  //show results in a table on UI
  tableOfVideoContent_div.append(tableDefinition);
  $('#tableOfVideoContentResults').append(tableOfVideoContent_div);

  //ensure table is nested in 'video-container' div for proper formatting
  div.append(tableOfVideoContent_div);
  $('#video-container').append(div);
  
  loadSocialLinks();
  console.log('generateResultList() end')
}


/**  Show Search Filters UI (from View Filters link)
 */
function showSearchFilters() {
  $("#searchFiltersDisplay").show();
  $("#hideFiltersLink").show();
  $("#showFiltersLink").hide();
}

/** Hide Search Filters UI (from Hide Filters link)
 */
function hideSearchFilters() {
  $("#showFiltersLink").show();
  $("#hideFiltersLink").hide();
  $("#searchFiltersDisplay").hide();
}

/** Show the Results Section on the UI
 */
function showResultsSection() {
  $("#map-canvas").show();
  $("#video-container").show();
}

/** Hide the Results Section on the UI
 */
function resetResultsSection() {
  $("#map-canvas").hide();
  $("#video-container").hide();
}

/** Show the Errors Section
 */
function showErrorSection() {
  $("#showErrors").show();
}

/**  Initializes the Map Interface, centers on input longitude and latitude, and plots all the search results with markers
 *  @param inputLat {string} - input latitude
 *  @param inputLong {string} - input longitude
 */
function initializeMap(inputLat, inputLong) {
  var mapOptions = {
    center: new google.maps.LatLng(inputLat, inputLong),
    zoom: parseInt(INITIAL_ZOOM_LEVEL)
  };

  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  //iterate through all the search results and create map markers for each
  for (var i = 0; i < finalResults2.length; i++) {
    var imageNumber = i + 1

    //use canned images from image folder for markers
    var image = { url: 'images/redMarker_' + imageNumber + '.png', size: new google.maps.Size(75, 62), origin: new google.maps.Point(0, 0)};

    var latLong = new google.maps.LatLng(finalResults2[i].lat, finalResults2[i].long);

    //create the marker on the map object
    var searchResultMarker = new google.maps.Marker({
      position: latLong,
      map: map,
      icon: image,
      animation: google.maps.Animation.DROP,
      labelContent: imageNumber,
      labelAnchor: new google.maps.Point(100, 100),
      labelClass: "labels",
      labelInBackground: false,
      url: finalResults2[i].url,
      title: finalResults2[i].title,
      zIndex: imageNumber,
      key: API_ACCESS_KEY
    });

    //Clicking on the marker will open the video in a new window
    google.maps.event.addListener(searchResultMarker, 'click', function() {
      window.open(this.url);
    });
  }
}

/**  Show the Custom Date Range Sections
 */
function displayCustomRangeSection() {
  var optionSelected = $('#timeWindow').find('option:selected').attr('value');

  if (optionSelected == 'custom_range') {
    $('#customRangeSection_1').show();
    $('#customRangeSection_2').show();
    $('#customRangeSection_3').show();
    $('#customRangeSection_4').show();
    $('#customRangeSection_5').show();
    $('#customRangeSection_6').show();
    $('#customRangeSection_7').show();
    $('#customRangeSection_8').show();
    $('#customRangeSection_9').show();
    $('#customRangeSection_10').show();
    $('#customRangeSection_11').show();
    $('#customRangeSection_12').show();
  } else {
    $('#customRangeSection_1').hide();
    $('#customRangeSection_2').hide();
    $('#customRangeSection_3').hide();
    $('#customRangeSection_4').hide();
    $('#customRangeSection_5').hide();
    $('#customRangeSection_6').hide();
    $('#customRangeSection_7').hide();
    $('#customRangeSection_8').hide();
    $('#customRangeSection_9').hide();
    $('#customRangeSection_10').hide();
    $('#customRangeSection_11').hide();
    $('#customRangeSection_12').hide();
  }
}

/**  This function uses Google Maps Geo Encoder, to convert search location to  Latitude and Longitude
 *   and then generate a search request object.   Request object is then passed to processYouTubeRequest for processing.
 */
function getLocationSearchResults() {
  console.log('getLocationSearchResults() start');
  console.log('inputObject.inputSearchLocation is'+inputObject.inputSearchLocation);
  geocoder.geocode({ 'address': inputObject.inputSearchLocation }, function(results, status) {
    console.log("status is " + status);
    if (status == google.maps.GeocoderStatus.OK) {
      //store latitude and longitude from geo coder into the inputObject
      inputObject.inputLat = results[0].geometry.location.lat();
      inputObject.inputLong = results[0].geometry.location.lng();
       
      //If the end user submitted a channel list then make search calls for each channel in the list
/*
      if (inputObject.hasChannelList) {
        //split list by channel
        var channelArray = inputObject.inputChannelList.split(",");

        for (var i = 0; i < channelArray.length; i++) {
          inputObject.currentChannel = channelArray[i].trim();

          console.log("ZZZZ inputObject.inputLiveOnly "+inputObject.inputLiveOnly)
          alert("ZZZZ inputObject.inputLiveOnly "+inputObject.inputLiveOnly)
          if (inputObject.inputLiveOnly) {
            console.log("ZZZZ Searching:  Have Location, Specific Channel(s), Live Only")
            alert("ZZZZ inputObject.inputLiveOnly "+inputObject.inputLiveOnly)
            getPublishBeforeAndAfterTime();
            try {
              var request = gapi.client.youtube.search.list({
                q: inputObject.inputQuery,
                order: "date",
                type: 'video',
                part: 'snippet',
                maxResults: '50',
                eventType: 'live',
                videoLiscense: inputObject.videoLiscense,
                videoEmbeddable: inputObject.videoEmbeddable,
                channelId: inputObject.currentChannel,
                location: inputObject.inputLat + "," + inputObject.inputLong,
                locationRadius: inputObject.inputLocationRadius,
                publishedAfter: publishAfterTime,
                publishedBefore: publishBeforeTime,
                key: API_ACCESS_KEY,
              });
            } catch (err) {
              //cannot search via the YouTube API
              showConnectivityError();
            }
          } else {
            console.log("Searching:  Have Location, Specific Channel(s), Live and VOD")
            getPublishBeforeAndAfterTime()
            try {
              var request = gapi.client.youtube.search.list({
                q: inputObject.inputQuery,
                order: "date",
                type: 'video',
                part: 'snippet',
                maxResults: '50',
                videoLiscense: inputObject.videoLiscense,
                videoEmbeddable: inputObject.videoEmbeddable,
                channelId: inputObject.currentChannel,
                location: inputObject.inputLat + "," + inputObject.inputLong,
                locationRadius: inputObject.inputLocationRadius,
                publishedAfter: publishAfterTime,
                publishedBefore: publishBeforeTime,
                key: API_ACCESS_KEY,
              });
            } catch (err) {
              //cannot search via the YouTube API
              showConnectivityError();
            }
          }
          processYouTubeRequest(request);
        }
      //if the search is geo-based and only for a single channel
      } else {
  */    
        if (inputObject.inputLiveOnly) {
          console.log("XXXX Searching:  Have Location, No Specific Channel, Live Only")
          printInputObject();
          getPublishBeforeAndAfterTime();
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              //order: "date",
              order: "viewCount",
              type: "video",
              id: "iXxcjCNkHCU",
              eventType: "live",
              //part: "id,snippet,liveStreamingDetails", //not working
              part: "id,snippet",//works
              maxResults: "50",
              
              //videoLiscense: inputObject.videoLiscense,
              //videoEmbeddable: inputObject.videoEmbeddable,
              location: inputObject.inputLat + "," + inputObject.inputLong,
              locationRadius: inputObject.inputLocationRadius,
              //publishedAfter: publishAfterTime,
              //publishedBefore: publishBeforeTime,
              key: API_ACCESS_KEY
            });
          } catch (err) {
            //cannot search via the YouTube API
            console.log("XXX123 Error in connectivity");
            showConnectivityError();
          }
        } else {
          console.log("XXX Searching:  Have Location, No Specific Channel, Live and VOD")
          getPublishBeforeAndAfterTime();
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              //order: "date",
              order: "viewCount",
              type: "video",
              part: "id,snippet",
              location: inputObject.inputLat + "," + inputObject.inputLong,
              locationRadius: inputObject.inputLocationRadius,
              maxResults: "50",
              videoLiscense: inputObject.videoLiscense,
              videoEmbeddable: inputObject.videoEmbeddable,
              publishedAfter: publishAfterTime,
              publishedBefore: publishBeforeTime,
              key: API_ACCESS_KEY
            });
          } catch (err) {
            //cannot search via the YouTube API
            console.log("XXX Error in connectivity2");
            showConnectivityError();
          }
        }
        processYouTubeRequest(request);
      //}
    } else {
      console.log("XXX Error in connectivity3");
      showConnectivityError();
    }
    console.log('getLocationSearchResults() end');
  });
  
}

/**  This function is used to filter results a News publisher is probably not interested in (e.g. car ads)
 */
function filterIrrelevantResults() {
  finalResults2 = $.grep(finalResults, function(item) {
    return !(CAR_REGEX.test(item.title) || REAL_ESTATE_REGEX.test(item.title) || MLS_NUMB_REGEX.test(item.title) || HOME_FOR_SALE_REGEX.test(item.title) || REALTY_REGEX.test(item.title));
  });
}

/**  This function prints the inputObject which is useful for debugging
 */
function printInputObject() {
  console.log(inputObject);
}

/**  This function resets the inputObject, so no old data is carried over
 */
function cleanInputObject() {
  inputObject = {};
}

/**  This function takes a date object and returns a UTC formatted date string
 *  @param {object} - Date object
 *  @return {string} - String with the date in UTC format
 */
function convertDateToTimeDateStamp(dateObj) {
  return dateObj.getUTCFullYear() + '-' + formatAsTwoDigitNumber(dateObj.getUTCMonth() + 1) + '-' + formatAsTwoDigitNumber(dateObj.getUTCDate()) + 'T' + formatAsTwoDigitNumber(dateObj.getUTCHours()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCMinutes()) + ':' + formatAsTwoDigitNumber(dateObj.getUTCSeconds()) + 'Z';
}

/**  This function takes a number and returns its two digital string equivalent
 *  @param {number} - number to be converted
 *  @return {string} - number represented as a two digit string
 */
function formatAsTwoDigitNumber(numb) {
  if (numb < 10) {
    return String('0' + numb);
  } else {
    return String(numb);
  }
}

/**  This function calculates the before and after timestamps needed for the API search and stores them in global variables
 */
function getPublishBeforeAndAfterTime() {
  //If the input object has a custom range, then format the MM-DD-YYYY date into a UTC format
  if (inputObject.inputTimeWindow && inputObject.inputTimeWindow === 'custom_range' && inputObject.inputStartDate.length !== 0 && inputObject.inputEndDate.length !== 0) {
    var startDate = inputObject.inputStartDate;
    var endDate = inputObject.inputEndDate;

    publishAfterTime = "" + startDate.substr(6, 4) + "-" + startDate.substr(0, 2) + "-" + startDate.substr(3, 2) + "T00:00:00Z";
    publishBeforeTime = "" + endDate.substr(6, 4) + "-" + endDate.substr(0, 2) + "-" + endDate.substr(3, 2) + "T00:00:00Z";
  //If time comes from drop down option, convert to UTC format
  } else {
    var nowTime_TimeStamp = convertDateToTimeDateStamp(new Date())
    var nowTimeMilliSecs = new Date().getTime();

    //if publishBeforeTime is blank or the user clicked the search button then
    //set publishBeforeTime to current time.  Otherwise we want to use the value
    //from the URL parameter
    if (!publishBeforeTime || queryFromClickSearchNotURL) {
      publishBeforeTime = nowTime_TimeStamp;
    }

    //define the before time in milliseconds by subtracting time window from the time right now
    var thresholdTime = 0;

    numberMilliSecondsInHour = 1000 * 60 * 60;
    if (inputObject.inputTimeWindow === 'hour') {
      thresholdTime = nowTimeMilliSecs - numberMilliSecondsInHour;
    } else if (inputObject.inputTimeWindow === '3hours') {
      thresholdTime = nowTimeMilliSecs - (3 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '6hours') {
      thresholdTime = nowTimeMilliSecs - (6 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '9hours') {
      thresholdTime = nowTimeMilliSecs - (9 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '12hours') {
      thresholdTime = nowTimeMilliSecs - (12 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '24hours') {
      thresholdTime = nowTimeMilliSecs - (24 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === 'week') {
      thresholdTime = nowTimeMilliSecs - (24 * 7 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === '30days') {
      thresholdTime = nowTimeMilliSecs - (24 * 30 * numberMilliSecondsInHour);
    } else if (inputObject.inputTimeWindow === 'year') {
      thresholdTime = nowTimeMilliSecs - (24 * 365.25 * numberMilliSecondsInHour);
    } else {
      thresholdTime = 0
    }

    //if threshold time is 0 then set before to epoch
    if (thresholdTime === 0) {
      publishAfterTime = '1970-01-01T00:00:00Z';
    } else {
      publishAfterTime = convertDateToTimeDateStamp(new Date(thresholdTime));
    }
  }
}

/**  This function displays a connectivity error to the end user in the event
 *  that we lose connectivity to one or more of the Google APIs
 */
function showConnectivityError() {
  var div = $('<div>');
  div.addClass('showErrors');
  div.append("Error connecting to Google APIs");

  $('#showErrorsContainer').empty();
  $('#showErrorsContainer').append(div);
  showErrorSection();
}
