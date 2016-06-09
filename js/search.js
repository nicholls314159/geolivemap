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
 *  @fileoverview  This code is uses Google Maps, YouTube Data, and many other APIs to create an integrated live stream
 *  discovery tool.   
 *  @author:  Stephen Nicholls, June 5, 2016
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

var geoLiveMapInInitialState = false;
var lastCityToSearch = false;

//publishAfterTime and publishBeforeTime define the before and after times to submit for the search
//var inputObject.publishAfterTime = '';
//var publishBeforeTime = '';

//queryFromClickSearchNotURL is a flag which indicates if the search originated from a clicked search button or from loading the parameters from the URL
var queryFromClickSearchNotURL = false;

//INITIAL_ZOOM_LEVEL is the zoom level that is set as default when our map is created
var INITIAL_ZOOM_LEVEL = 5;
var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

var INITIAL_CITY_LIST = ['Tokyo','New York','Los Angeles','London']

//API access key for this project
var API_ACCESS_KEY = 'AIzaSyDJTIlvEzU-B2152hKEyUzBoAJmflJzcjU';

// Pre-defined regular expressions to filter results by
var CAR_REGEX = /\d{4} (?:dodge|chevy|ford|toyota|bmw|mercedes|honda|chrysler|pontiac|hyundai|audi|jeep|scion|cadillac|volks|acura|lexus|suburu|nissan|mazda|suzuki|buick|gmc|chevrolet|lincoln|infiniti|mini|hummer|porsche|volvo|land|kia|saturn|mitsubishi)/i;
var HOME_FOR_SALE_REGEX = /home for sale/i
var MLS_NUMB_REGEX = /MLS#/i
var REAL_ESTATE_REGEX = /real estate/i
var REALTY_REGEX = /realty/i

//Current page URL for access params
var startURL = '';

//URL generated from Google Shortener service, for use in tweets and FB posts
var shortURL = '';

/** Initialize filters, reset the results section, initialize Data client
 */
$(document).ready(function() {
  hideSearchFilters();
  resetResultsSection();
  $.getScript('https://apis.google.com/js/client.js?onload=handleClientLoad');
});

/**  Initialize YouTube data client, initialize maps, set API access key, initialized url shortener
 */
function handleClientLoad() {
  gapi.client.load('youtube', 'v3', function() {
    $.getScript('https://maps.googleapis.com/maps/api/js?sensor=false&callback=handleMapsLoad&key=' + API_ACCESS_KEY);
    gapi.client.setApiKey(API_ACCESS_KEY); 
    gapi.client.load('urlshortener', 'v1',function(){});
  });
}

/**  Initialize maps geo coder and load parameters from the URL, if present; include mapOverlay functions
 */ 
function handleMapsLoad() {
  geocoder = new google.maps.Geocoder();
  $('#search-button').attr('disabled', false);
  startURL = window.location.href;
  
  
  
  if (startURL && startURL.indexOf('?q=') > 0) {
    geoLiveMapInInitialState = false;
    lastCityToSearch = false;
    loadParamsFromURL(startURL);
  }else{
    stuffToGetDone(function(){
        console.log("Should be Done with GET STUFF DONE ....now draw map")
        //Don't show result list -- end user will navigate using the map controls
        //generateResultList();
        initializeMap(inputObject.inputLat, inputObject.inputLong);
    });
    
  }

  //include map overlay code
  $.getScript("../js/mapOverlay.js");
}


function stuffToGetDone(){
  console.log("Start stuffToGetDone")
    geoLiveMapInInitialState = true;
    lastCityToSearch = false;
    cleanInputObject();
    url1 = "https://8080-dot-2061374-dot-devshell.appspot.com/?q=&la=40.7127837&lo=-74.00594130000002&lr=1000km&cl=&sl=new%20york&eo=false&cco=false&zl=0"
    loadParamsFromURL(url1);
    cleanInputObject();
    //lastCityToSearch = true;
    url2 = "https://8080-dot-2061374-dot-devshell.appspot.com/?q=&la=35.6894875&lo=139.69170639999993&lr=1000km&cl=&sl=tokyo&eo=false&cco=false&zl=0"
    //lastCityToSearch = true;
    loadParamsFromURL(url2);
    console.log("END stuffToGetDone")
}


/**
 * This function generates the FB and Twitter buttons and embeds them in the HTML
 */
function loadSocialLinks(){
  //remove any old results
  $('#socialCell').empty();
  
   //if its the first time the page has been loaded and short url is not available
   //then provided vanity URL for Facebook and Twitter links
   startURL = window.location.href;
   if((startURL.includes('?authuser=0')) && (shortURL.length < 2)){
        shortURL = "http://www.geosearchtool.com";
   }

   var social_div = '';
   social_div = $('<div>');
   social_div.addClass('socialCell');  

   var socialTableDefinition = $('<table>');
   var socialRow = $('<tr>');
   var socialCell = $('<td>');
   var facebookFunction = '<div id="fb-root"></div><script>(function(d, s, id) { var js, fjs = d.getElementsByTagName(s)[0]; if (d.getElementById(id)) return; js = d.createElement(s); js.id = id; js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.6"; fjs.parentNode.insertBefore(js, fjs);}(document, "script", "facebook-jssdk"));</script>'
   var facebookLink = '<div class="fb-like" data-href="'+shortURL+'" data-layout="button" data-action="like" data-show-faces="true" data-share="true"></div>'
   var twitterLink = '<a href="https://twitter.com/share" class="twitter-share-button" data-url="'+shortURL+'" data-text="Check out this video!!!" data-hashtags="geosearchtool">Tweet</a>'
   var twitterFunction = "<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}}(document, 'script', 'twitter-wjs');</script>"

   socialCell.append(facebookFunction);
   socialCell.append(facebookLink);
   socialCell.append('&nbsp;&nbsp;&nbsp;');
   socialCell.append(twitterLink);
   socialCell.append(twitterFunction);
   
   socialRow.append(socialCell);
   socialTableDefinition.append(socialRow);
   social_div.append(socialTableDefinition);
   $('#socialCell').append(social_div);
}

/**
 *  This function clears results from the UI, routes location searches to getLocationSearchResults(),
 *  generates a request object, from the inputObject for non-location searches and
 *  passes the request to processYouTubeRequest()
 */
function searchYouTube() {
  
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
    if (inputObject.hasChannelList) {
      //split list by channel
      var channelArray = inputObject.inputChannelList.split(",")
      for (var i = 0; i < channelArray.length; i++) {
        inputObject.currentChannel = channelArray[i].trim();

        getPublishBeforeAndAfterTime();
        try {
          var request = gapi.client.youtube.search.list({
            q: inputObject.inputQuery,
            order: "viewCount",
            type: 'video',
            part: 'snippet',
            maxResults: '50',
            eventType: 'live',
            videoLiscense: inputObject.videoLiscense,
            videoEmbeddable: inputObject.videoEmbeddable,
            channelId: inputObject.currentChannel,
            key: API_ACCESS_KEY
          });
        } catch (err) {
          //cannot search via the YouTube API, update end-user with error message
          showConnectivityError();
        }
        //Call processYouTubeRequest to process the request object
        processYouTubeRequest(request);
      }
    } else {
        try {
          var request = gapi.client.youtube.search.list({
            q: inputObject.inputQuery,
            order: "viewCount",
            type: 'video',
            part: 'snippet',
            maxResults: '50',
            eventType: 'live',
            videoLiscense: inputObject.videoLiscense,
            videoEmbeddable: inputObject.videoEmbeddable,
            key: API_ACCESS_KEY
          });
        } catch (err) {
          //cannot search via the YouTube API, update end-user with error message
          showConnectivityError();
        }
      processYouTubeRequest(request);
    }
  }
}

/** This function removes hard coded spaces from url params e.g. "new%20york" is replaced by "new york"
 */ 
function cleanStringOfHTMLEncodedSpaces(raw_string){
  if (raw_string){
      return raw_string.split("%20").join(" ");
  }else{
      return raw_string;
  }
}


// This function loads parameters from a URL into the input object
function loadParamsFromURL(urlToParse) {
  //startURL = window.location.href;

  //reset the input object to remove any old data
  cleanInputObject();

  //If the URL does not contain search parameters to parse skip to end of function
  if (urlToParse && urlToParse.indexOf('?q=') > 0) {
    //create an array of parameters parsed from URL
    var paramListCollection = urlToParse.slice(urlToParse.indexOf('?q=') + 1).split("&");

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
    inputObject.inputChannelList = cleanStringOfHTMLEncodedSpaces(urlParams['cl']);
    inputObject.inputSearchLocation = cleanStringOfHTMLEncodedSpaces(urlParams['sl']);
    inputObject.inputZoomLevel = cleanStringOfHTMLEncodedSpaces(urlParams['zl']);

    inputObject.inputEmbedsOnly = urlParams['eo'];
    if (urlParams["eo"] === "true") {
      inputObject.inputEmbedsOnly = true;
    } else {
      inputObject.inputEmbedsOnly = false;
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
    
    //if the search location, dates, and/or keywords are in the URL then repopulate the form with them
    //this if statement should return true if the variable is NOT null, undefined, length 0, false
    if(inputObject.inputSearchLocation){
      $('#searchLocation').val(inputObject.inputSearchLocation);
    }
    if(inputObject.inputQuery){
      $('#query').val(inputObject.inputQuery);
      showSearchFilters();
    }
    if(inputObject.inputLocationRadius){
      $('#locRadius').val(inputObject.inputLocationRadius);
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
  inputObject.inputChannelList = $('#channelList').val();
  inputObject.inputSearchLocation = $('#searchLocation').val();
  inputObject.inputEmbedsOnly = 'false';
  inputObject.inputCreativeCommonsOnly = 'false';
  inputObject.inputEmbedsOnly = $('#embedOnly').is(':checked');
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
  inputObject.hasChannelList = false;
  inputObject.hasSearchLocation = false;

  if (inputObject.inputSearchLocation && inputObject.inputLocationRadius) {
    inputObject.hasSearchLocation = true;
  }

  // reset validation errors flag
  validationErrors = false;

  //create array to store validation errors
  var validationErrorsArr = [];

  //define regular expressions for validating input values
  var dateRegEx = new RegExp("[0-1][0-9][-][0-3][0-9][-][2][0][0-1][0-9]");
  var numberRegEx = new RegExp("^[0-9]+")

  //Validate that location and location radius are set to conduct search
  if (inputObject.inputSearchLocation && !inputObject.inputLocationRadius) {
    validationErrorsArr.push("You must have both a location and radius for a location search");
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

/**  This function generates a URL, with all the search parameters, which is then
 *  loaded into the omnibox of the browser.
 *  @returns url {string}
 */
function generateURLwithQueryParameters() {
  parameterString = '';

  parameterString =
    "?q=" + inputObject.inputQuery + "&la=" + inputObject.inputLat +
    "&lo=" + inputObject.inputLong + "&lr=" + inputObject.inputLocationRadius +
    "&cl=" + inputObject.inputChannelList +
    "&sl=" + inputObject.inputSearchLocation + "&eo=" + inputObject.inputEmbedsOnly +
    "&cco=" + inputObject.inputCreativeCommonsOnly +
    "&zl=" + inputObject.inputZoomLevel;
  
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
  console.log("Start ....  processYouTubeRequest")
  request.execute(function(response) {
    var resultsArr = [];
    var videoIDString = '';

    //if the result object from the response is null, show error; if its empty, remove old results and display
    //message on how to broaden search to get more results.
    if ('error' in response || !response) {
      showConnectivityError();
    } else if (!response.result || !response.result.items) {
      updateSearchResultCount(0);
      resetResultsSection();
      $("div").remove(".tableOfVideoContentResults");
    } else {
      var entryArr = response.result.items;
      for (var i = 0; i < entryArr.length; i++) {
        var videoResult = new Object();
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
        videoResult.thumbNailURL = entryArr[i].snippet.thumbnails.default.url;

        videoResult.description = entryArr[i].snippet.description;
        videoResult.displayTimeStamp = getDisplayTimeFromTimeStamp(entryArr[i].snippet.publishedAt)
        videoResult.publishTimeStamp = entryArr[i].snippet.publishedAt;

        //add result to results
        resultsArr.push(videoResult);
      }
console.log("processYouTubeRequest.... resultsArr size is "+resultsArr.length)
      //Now we will use the string of video IDs from the search to do another API call to pull latitude
      //and longitude values for each search result

      //remove trailing comma from the string of video ids
      var videoIDStringFinal = videoIDString.substring(0, videoIDString.length - 1);

      //generate request object for video search
      var videoIDRequest = gapi.client.youtube.videos.list({
        id: videoIDStringFinal,
        part: 'id,snippet,recordingDetails,liveStreamingDetails',
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
            if(this.liveStreamingDetails && this.liveStreamingDetails.concurrentViewers){
              for (var i = 0; i < resultsArr.length; i++) {
                if (resultsArr[i].videoId === videoRequestVideoId) {
                  resultsArr[i].concurrentViewers = this.liveStreamingDetails.concurrentViewers;
                  resultsArr[i].scheduledStartTime = this.liveStreamingDetails.scheduledStartTime;
                  resultsArr[i].actualStartTime = this.liveStreamingDetails.actualStartTime;
                  break;
                }
              }
            }else{
              for (var i = 0; i < resultsArr.length; i++) {
                if (resultsArr[i].videoId === videoRequestVideoId) {
                  resultsArr[i].concurrentViewers = 'NA';
                  resultsArr[i].scheduledStartTime = 'NA';
                  resultsArr[i].actualStartTime = 'NA'
                }
              }
            }            //console.log("concurrentViewers for this stream is...." + resultsArr[i].concurrentViewers)
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
console.log("processYouTubeRequest... finalResults size is "+finalResults.length)
        if (finalResults.length === 0) {
          //Remove results section as there is nothing to display
          resetResultsSection();
          $("div").remove(".tableOfVideoContentResults");
        } else {
          //show results section
          showResultsSection();

          //remove any old results
          $("div").remove(".tableOfVideoContentResults");

          //generate result list and map of videos
          if(geoLiveMapInInitialState && lastCityToSearch){
              generateResultList();
              initializeMap(inputObject.inputLat, inputObject.inputLong);
          }else if(!geoLiveMapInInitialState){
             generateResultList();
             initializeMap(inputObject.inputLat, inputObject.inputLong);
          }
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
    requestShortener.execute(function(responseShortener) 
    {
       if(responseShortener.id != null)
       {
          shortURL = responseShortener.id;
       }
    });
  });
  console.log("END.... processRequest")
}


/** This function generates the UI of the results section after the search has been processed
 */
function generateResultList() {
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

    var schedStartTime = 'NA';
    var actualStartTime = 'NA';
    if(finalResults2[i].scheduledStartTime){
      schedStartTime = getDisplayTimeFromTimeStamp(finalResults2[i].scheduledStartTime)
    }
   if(finalResults2[i].actualStartTime){
     actualStartTime = getDisplayTimeFromTimeStamp(finalResults2[i].actualStartTime)
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
    
    //truncate title to 40 chars for display
    var title = finalResults2[i].title
    if(title && title.length > 50){
      title = finalResults2[i].title.substring(0,50) + "..."
    }

    var videoString = "<attr title='Description: " + finalResults2[i].description + "'><a href='" + videoURLString + "'>" + title + "</a></attr><br>";
    //var channelString = "Channel:  <attr title='Click to go to uploader's Channel'><a href='https://www.youtube.com/channel/" + channelID + "' target='_blank'>" + channel + "</a></attr><br>";
    var concurrentUsersString = "Concurrent Viewers:  " + finalResults2[i].concurrentViewers + "<br>";
    var scheduledStartTimeString = "Scheduled Start Time:  " + schedStartTime + "<br>";
    var actualStartTimeString = "Actual Start Time:  " + actualStartTime + "<br>";
    
    metaDataCell.append(videoString);
    //metaDataCell.append(channelString);
    metaDataCell.append(concurrentUsersString);
    metaDataCell.append(scheduledStartTimeString);
    metaDataCell.append(actualStartTimeString);

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
  
  //define the map object
  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  for (var i = 0; i < finalResults2.length; i++) {
    var imageNumber = i + 1

    var latLong = new google.maps.LatLng(finalResults2[i].lat, finalResults2[i].long);

    //create the marker on the map object
    var searchResultMarker = new google.maps.Marker({
      position: latLong,
      map: map,
      animation: google.maps.Animation.DROP,
      zIndex: imageNumber,
      icon:{
        url: 'images/redMarker_' + imageNumber + '.png',
        size: new google.maps.Size(75, 62),
        scaledSize: new google.maps.Size(75, 62)
      }
    });

    contentString = generatePopupBoxHTML(finalResults2[i]);
    generateMapOverlayWindowAndMarkerListener(searchResultMarker, contentString);
  }
}

/**  This function creates a Map Overlay object, sets its content; then adds listener to the submitted map
 *   marker and within the listener opens the Map Overlay object.
 */ 
function generateMapOverlayWindowAndMarkerListener(searchResultMarker, contentString){
    var infoWindow = new (GenCustomWindow())();
    infoWindow.setContent(contentString);
    searchResultMarker.addListener('click', function() {
      infoWindow.open(searchResultMarker.get('map'), searchResultMarker);
    });
}

/** This function creates the HTML content of the popup which appears when a map marker icon is clicked.
 */ 
function generatePopupBoxHTML(videoResult){

  var channel = videoResult.channel;
  var channelID = videoResult.channelID;
  var videoURLString = "/view.html?v="+videoResult.videoID;
  var videoURLStringLong = "http://www.geosearchtool.com"+videoURLString;
  var schedStartTime = 'NA';
  var actualStartTime = 'NA';
  if(videoResult.scheduledStartTime){
    schedStartTime = getDisplayTimeFromTimeStamp(videoResult.scheduledStartTime)
  }
  if(videoResult.actualStartTime){
    actualStartTime = getDisplayTimeFromTimeStamp(videoResult.actualStartTime)
  }

  if (!videoResult) {
    channel = channelID;
  }
  var popupTitle = "";
  if(videoResult.title){
    //Truncate title to fit popup
    popupTitle = videoResult.title.substring(0,25) + "..."
  }

  var PopupBoxHTML = 
  '<table width=220 cellpadding=5>'+
  '<tr><td><div class="mapOverlayClose">X</div></td></tr>'+
  '<tr>'+
  '<td width=220 style="word-wrap: break-word">'+ popupTitle + "<br>"+  
  "</td>"+
  "</tr>"+
  '<tr>'+
  '<td width=220 align="center">'+
  "<a href='" + videoURLString + "'>" +
  "<img src='" + videoResult.thumbNailURL + "' height='180' width='180' align='middle'/>" +
  "</a><br>"+
  "</td>"+
  "</tr>"+
  '<tr>'+
  '<td width=220 style="word-wrap: break-word">'+
  "Concurrent Viewers:  " + videoResult.concurrentViewers + "<br>"+
  "</td>"+
  "</tr>"+
  "</table>"

  return PopupBoxHTML;
}

/**  This function takes the time format from the response object and converts into a format
 *  which is easier to read.
 */ 
function getDisplayTimeFromTimeStamp(timeStamp){
    console.log("getDisplayTimeFromTimeStamp with "+timeStamp)
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
      if (inputObject.hasChannelList) {
        //split list by channel
        var channelArray = inputObject.inputChannelList.split(",");

        for (var i = 0; i < channelArray.length; i++) {
          inputObject.currentChannel = channelArray[i].trim();
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              order: "viewCount",
              type: 'video',
              part: 'snippet',
              maxResults: '50',
              eventType: 'live',
              videoLiscense: inputObject.videoLiscense,
              videoEmbeddable: inputObject.videoEmbeddable,
              channelId: inputObject.currentChannel,
              location: inputObject.inputLat + "," + inputObject.inputLong,
              locationRadius: inputObject.inputLocationRadius,
              key: API_ACCESS_KEY,
            });
          } catch (err) {
            //cannot search via the YouTube API
            showConnectivityError();
          }
          processYouTubeRequest(request);
        }
      //if the search is geo-based and only for a single channel
      } else {
          try {
            var request = gapi.client.youtube.search.list({
              q: inputObject.inputQuery,
              order: "viewCount",
              type: "video",
              part: "id,snippet",
              maxResults: "50",
              eventType: "live",
              videoLiscense: inputObject.videoLiscense,
              videoEmbeddable: inputObject.videoEmbeddable,
              location: inputObject.inputLat + "," + inputObject.inputLong,
              locationRadius: inputObject.inputLocationRadius,
              //publishedAfter: inputObject.publishAfterTime,
              //publishedBefore: inputObject.publishBeforeTime,
              key: API_ACCESS_KEY
            });
          } catch (err) {
            //cannot search via the YouTube API
            showConnectivityError();
          }
        processYouTubeRequest(request);
      }
    } else {
      showConnectivityError();
    }
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
