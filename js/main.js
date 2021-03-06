var rand = Math.random;
var iter = setInterval;
var DEBUG = false;
var markTimestamp = -1;
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var all = null;
var loopHandles = [];
var jumpTimestamp = 0;
var row = 4;
var col = 4;
var cellWidth = 50;
var cellHeight = 50;
var targetVideos = [];
var initialLoading = true;
var youtubeid = "";
var gridVideos = [];

var YTSTATE_UNSTARTED = -1;
var YTSTATE_ENDED = 0;
var YTSTATE_PLAYING = 1;
var YTSTATE_PAUSED = 2;
var YTSTATE_BUFFERING = 3;
var YTSTATE_VIDEOCUED = 5;

function onYouTubeIframeAPIReady() {
  if(DEBUG)console.log("is ready");

  // create(1,1,"Mh4f9AYRCZY");
  // setQ(all, 'hd720');
}

function onPlayerReady(event) {
  var i = parseInt(event.target.getIframe().getAttribute("row"))
  var j = parseInt(event.target.getIframe().getAttribute("col"))
  if(!gridVideos[i]) gridVideos[i] = [];
  gridVideos[i][j] = event.target;
  function initialize(){
    if(event.target.mute == undefined){
      setTimeout(initialize,10);
      return;
    }
    event.target.mute()
    event.target.seekTo(0);
  }
  event.target.initialized = true;
  initialize();

}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;

function parseYTState(num){
  if( num == -1) return "unstarted";
  if( num == 0) return "ended";
  if( num == 1) return "playing";
  if( num == 2) return "paused";
  if( num == 3) return "buffering";
  if( num == 5) return "video cued";
  return "unknown";
}

function setMark(){
  markTimestamp = (new Date()).getTime();
}

// run the function when the document is ready
$(document).ready(function () {
  connectOSC();
  
  var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
        lineNumbers: false,
        styleActiveLine: true,
        matchBrackets: true,
        height: 'auto',
        mode:{name: "javascript", json: true}
    });
    // jquery ui
    $( "#resizable" ).resizable();
    $( "#resizable" ).draggable();

    var livecode = function(cm){
      var doc = cm.getDoc();
      var code = doc.getSelection();
      if(code.length > 0){ // when there is any selected text
        if(DEBUG)console.log(code);
        try {
            if(code.includes("setInterval")){
              var sure;
              if(code.substring(0,10)== "setInterval"){
                sure = confirm("Are you sure you that want setInterval without a handle?");
                if(!sure)return;
              }
              if(!code.includes("clearInterval")){
                var sure = confirm("Are you sure? This does not have clearInterval. ");
                if(!sure) return;
              }
            }
            eval(code);
            _.defer(function(){
              var start = doc.getCursor("anchor");
              var end = doc.getCursor("head");
              if(start.line > end.line || (start.line == end.line && start.ch > end.ch)){
                var temp = start;
                start = end;
                end = temp;
              }
              var obj = doc.markText(start,end,{className:"ex-high"});
              setTimeout(function(){
                _.defer(function(){
                  obj.clear();
                });
              },100);
            });

        } catch (e) {
            alert(e.message);
            console.error(e);
        }
      }else{ // when there is no selectino, evaluate the line where the cursor is
        code = doc.getLine(cm.getDoc().getCursor().line);
        if(DEBUG)console.log(code);
        try {
            eval(code);
            _.defer(function(){
              var start = doc.getCursor();
              var obj = doc.markText({line:start.line, ch:0},{line:start.line, ch:code.length},{className:"ex-high"});
              setTimeout(function(){
                _.defer(function(){
                  obj.clear();
                });
              },100);
            });
        } catch (e) {
            alert(e.message);
            console.error(e);
        }
      }
    };

    var map = {"Shift-Enter": livecode};
    var showHelp = function(cm){
      var code = cm.getDoc().getSelection();
      if (code.length <= 0){ // when there is any selected text
        code = cm.getDoc().getLine(cm.getDoc().getCursor().line);
      }
      var index = code.indexOf('(');
      var fName = code.substring(0, index);
      console.log(fName);
      help(fName);
    };

    var map = {
      "Shift-Enter": livecode,
      "Alt-Enter": showHelp
    };
    editor.addKeyMap(map);

	$("#youtube-result").hide();

  $(window).keydown(function(e){
      if (e.ctrlKey){
        $("#code-container").toggle();
        $(".go-back-editor").toggle();
      }
  });


  $(".go-back-button").click(function(){
    $("#code-container").toggle();
    $(".go-back-editor").toggle();
  });
});

/**
 * Add columns and rows to the grid
 * @param {integer} addRow - number of rows to add.
 * @param {integer} addCol - number of columns to add.
 * @param {string} id - YouTube identifier.
 */
function add(addRow,addCol,id){
  initialLoading = true;

  var row = gridVideos.length + addRow;
  var col = addCol;
  if(gridVideos[0])
    col +=  gridVideos[0].length;

  if(id)
    youtubeid = id;

  if(row <0 || col < 0){
    alert("Row col value negatives.!");
    return;
  }

  var rowHeight = 12/row;
  var colWidth = 12/col;

  if(12%row!=0 || 12%col!=0){
    alert("we can only take a divisor of 12.");
    return;
  }

  var divrowclass = 'row-xs-'+rowHeight;
  var divcolclass = 'yt-cell col-sm-'+colWidth+' col-md-'+colWidth+' col-lg-'+colWidth+' col-xs-'+colWidth;

  var divrowhtml = '<div class='+divrowclass+'">'
  var divcolhtml = '<div class = "'+divcolclass+'"></div>'
  // let's add the videos
  cellWidth = $(document).width() / col;
  cellHeight = $(document).height() / row;

  // let's resize the existing divs in gridstack.
  for (var i=0; i < gridVideos.length; i++){
    divRowGrid[i].removeClass();
    divRowGrid[i].addClass(divrowclass);
    for (var j=0; j< gridVideos[0].length; j++){
      $(gridVideos[i][j].getIframe()).removeClass().addClass(divcolclass);
      gridVideos[i][j].setSize(cellWidth,cellHeight);
    /*  var stateDV = $("#state-div-"+ i +"-"+ j);
      stateDV.removeClass();
      stateDV.addClass(divrowclass);

      $("#state-div-"+ i +"-"+ j).width(cellWidth);
      $("#state-div-"+ i +"-"+ j).height(cellHeight);*/
    }
  }


  // add cols first
  for (var i=0; i <gridVideos.length; i++){
    if(!gridVideos[0])
      gridVideos = [];
    for (var j= gridVideos[0].length; j< col; j++){
      numLoadingVideo++;
      var dcol = $(divcolhtml);
      dcol.attr("id","cell-"+ i +"-"+ j);
      dcol.attr("row",i);
      dcol.attr("col",j);
      divRowGrid[i].append(dcol)
      if(id)addVideo(i,j);
    }
  }

  // add rows first
  for (var i=gridVideos.length; i <row; i++){
    var ddiv = $(divrowhtml);
    var ddiv_state = $(divrowhtml);
    $("#youtubegrid").append(ddiv);

    for (var j= 0; j< col; j++){
      numLoadingVideo++;
      var dcol = $(divcolhtml);
      dcol.attr("id","cell-"+ i +"-"+ j);
      dcol.attr("row",i);
      dcol.attr("col",j);
      ddiv.append(dcol)
      if(id)addVideo(i,j);
    }
    divRowGrid[i] = ddiv;
  }
}

/**
 * Create a grid
 * @param {integer} row - number of rows to create.
 * @param {integer} col - number of columns to create.
 * @param {string} id - YouTube identifier.
 */
function create(row,col,id){
  youtubeid = id;
  initialLoading = true;
  divRowGrid  = [];
  gridVideos = [];
  unloop();
  $("#youtubegrid").empty();
  $("#youtubegrid-state").empty();
  targetVideos = [];
  if(12%row!=0 || 12%col!=0){
    alert("we can only take a divisor of 12.");
    return
  }
  numLoadingVideo = row * col;

  var rowHeight = 12/row;
  var colWidth = 12/col;
  var divrowhtml = '<div class="row-xs-'+rowHeight+'">'
  var divcolhtml = '<div class = "yt-cell col-sm-'+colWidth+' col-md-'+colWidth+' col-lg-'+colWidth+' col-xs-'+colWidth+'"></div>'
  var spanhtml = '<span class = "player_state">state</span>'
  for (var i=0; i<row; i++){
    var ddiv = $(divrowhtml);
    var ddiv_state = $(divrowhtml);
    for  (var j=0; j<col; j++){
      var dcol = $(divcolhtml);
      var dcol_state = $(divcolhtml);
      dcol.appendTo(ddiv);
      dcol.attr("id","cell-"+ i +"-"+ j);
      dcol.attr("row",i);
      dcol.attr("col",j);
      divRowGrid[i] = ddiv;
      if(DEBUG){
        dcol_state.addClass("div_state");
        dcol_state.attr("id","state-div-"+ i +"-"+ j);
        var spanElem = $(spanhtml);
        spanElem.attr("id","state-cell-"+ i +"-"+ j);
        spanElem.appendTo(dcol_state);
        dcol_state.appendTo(ddiv_state);
      }

    }
    $("#youtubegrid").append(ddiv);
    if(DEBUG)$("#youtubegrid-state").append(ddiv_state);
    if(!DEBUG) $("#youtubegrid-state").remove();
  }

  cellHeight = ddiv.height();
  cellWidth = dcol.width();

  for ( i=0; i< row; i++){
    for ( j=0 ; j<col; j++){
      addVideo(i,j);
    }
  }
}

function addVideo(i,j){
  var player = new YT.Player("cell-"+ i +"-"+ j, {
     height: cellHeight,
     width:  cellWidth,
     videoId: youtubeid,
     events: {
       'onReady': onPlayerReady,
       'onStateChange': onPlayerStateChange
     },
     suggestedQuality:"small"
  });
}
var searchResult = [];

/**
 * Search YouTube. Selecto item on the right of the screen to get the YouTube identifier text.
 * @param {string} query - Query to search.
 */
function search(query) {
	$("#youtube-result").show();
	$('#youtube-result').empty();

	url = 'https://www.googleapis.com/youtube/v3/search';
	var params = {
		part: 'snippet',
		key: 'AIzaSyAgVwWjfP1LJ7lV1OacY_5OaHXPEe4As68', // github gist에서 본 api_token 이라서 새로 하나 받아야 할 것 같아요.
		q: query,
		type: "video",
    maxResults: 20,
    videoEmbeddable	:"true",
    videoLicense:"youtube"
	};

	$.getJSON(url, params, function (query) {
		searchResult = query.items
    var count = 0;
		searchResult.forEach(function(entry) {
		  if(DEBUG)console.log(entry.snippet.title); // 화면에 출력해보려고 했는데, codemirror에 output은 어떻게 하는지 잘 모르겠네요.
	    console.log(entry.snippet.title); // 화면에 출력해보려고 했는데, codemirror에 output은 어떻게 하는지 잘 모르겠네요.

			title = entry.snippet.title;
			thumburl =  entry.snippet.thumbnails.default.url;
			thumbimg = '<img class="thumb-img" src="'+thumburl+'">';

			$('#youtube-result').append('<div class = "thumb" id="yt-r-' +entry.id.videoId+ '" yt-id="' +entry.id.videoId+ '"><div>' + thumbimg +'</div><div class = "thumb-title" >'+ count+'] '+title + '</div>');
      count++;
        // $("#youtube-result").append(entry.snippet.title + ",<span id=yt-r-" +entry.id.videoId+ " yt-id=" +entry.id.videoId+ ">" + entry.id.videoId + "</span><br>")
      $("#yt-r-" +entry.id.videoId).click(function(){
        updateCodeMirror("\"" + entry.id.videoId + "\"");
      });
		});
	});
}

function updateCodeMirror(data){
    var doc = $('.CodeMirror')[0].CodeMirror.getDoc();
    doc.replaceSelection(data); // adds a new line
    $("#youtube-result").hide();
    $('.CodeMirror')[0].CodeMirror.focus();

}


/**
 * Change playback speed of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {float} newSpeed - New speed.
 */
function speed(list, newSpeed) {
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(video){
      video.setPlaybackRate(newSpeed)
    });
}

/**
 * mute/unMute the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {bool} mute - true = mute / false = unMute.
 */
function mute(list, mute) {
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(video){
      if (mute)
        video.mute()
      else
        video.unMute()
    });
}

/**
 * Set volume of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} vol - New volume. (0 ~ 100)
 */
function volume(list,vol) {
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    video.originalVolume = vol;
    video.setVolume(vol);
  });
}

/**
 * Increase (or decrease) volume of the selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} diff - To decrease volume, pass negative number.
 */
function turnup(list, diff) {
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    var newVolume = video.getVolume() + diff
    video.setVolume(newVolume)
  });
}
//function alternate(list, )

/**
 * Replace the selected videos with id.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {string} id - YouTube identifier.
 * @param {bool} cancelloop - To cancel the loop that may have been set earlier.
 */
 function cue(list, id, cancelloop) {
   if(!cancelloop) cancelloop = true;
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    video.cueVideoById(id)
    video.initialized = true;
    video.mute();
    video.playVideo();
    video.setPlaybackRate(1);
    event.target.initialized = true;
    if(video.loopHandle && cancelloop){
      clearInterval(video.loopHandle);
    }
    if(video.here)video.here = null;
  });
}

function fadeInInner(video, diff) {
    var currentVolume = video.getVolume();
    // console.log("cur: " + currentVolume + "/ diff: "+diff);
    if (currentVolume < 100) {
        video.setVolume(currentVolume + diff);
        return setTimeout((function() {
            return fadeInInner(video, diff);
        }), 100);
    }
}

/**
 * Start playing the selected videos with increasing volume.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} duration - Duration of time in seconds.
 */
function fadeIn(list,duration) {
    if(!duration) duration = 5;
    var diff = 10.0 / duration;
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(v){
      v.setVolume(0);
      if(v.getPlayerState() != YTSTATE_PLAYING)
        v.playVideo();
    });

    selectedVideos.forEach(function(v){
      fadeInInner(v, diff);
    });

}

function fadeOutInner(video, diff) {
    var currentVolume = video.getVolume();
    if (currentVolume > 0) {
        video.setVolume(currentVolume - diff);
        return setTimeout((function() {
            return fadeOutInner(video, diff);
        }), 100);
    }
}

/**
 * Fade out the volume of selected videos.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} duration - Duration of time in seconds.
 */
function fadeOut(list,duration) {
    if(!duration) duration = 5;
    var diff = 10.0 / duration;
    var selectedVideos =  selectVideos(list);
    selectedVideos.forEach(function(v){
      fadeOutInner(v, diff);
    });
}

/**
 * Returns an array of video index that excludes the specified video index.
 * e.g. if the current grid is 3X3.
 * not(1) returns [0,2,3,4,5,6,7,8]
 * e.g. if the current grid is 4X4.
 * not(8,7) returns [0,1,2,3,4,5,6,9,10,11,12,13,14,15]
 * @param {integer[]} indices - Indices to exclude.
 */
 function not() {
 	var list = [...Array(targetVideos.length).keys()];
 	for (var i = 0; i < arguments.length; i++) {
 		target = arguments[i];
 		index = list.indexOf(target);
 		if (index > -1) {
 			list.splice(index, 1);
 		}
 	}
 	return list;
 }

function selectVideos(list){
  var selectedVideos = []

  if (typeof(list) == "string") {
  	var condition = list;
  	var selectedVideos = [];
	for (var i = 0; i < targetVideos.length; i++) {
   		if (eval(i + condition))
   			selectedVideos.push(targetVideos[i]);
	}
	return selectedVideos;
  }
  else if (list === parseInt(list, 10) ){
      selectedVideos.push(targetVideos[list])
  }
  else if (list == null) {
      selectedVideos = targetVideos
  }
  else if (list.length > 1) {
      for(var i=0; i< list.length; i++){
          var index = list[i];
          selectedVideos.push(targetVideos[index]);
      }
  }
  else{
    alert("ERROR: edge case found", list);
  }
  return selectedVideos;
}

/**
 * Phase
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} interval - interval
 */
function phase(list,interval){ // interval and video id

  var selectedVideos =  selectVideos(list);
  if(interval>=0){
    for (var i=1; i<selectedVideos.length; i++){
      (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
          setTimeout(function(){
          selectedVideos[vindex].seekTo(selectedVideos[vindex].getCurrentTime()- vindex*interval);
        },vindex*interval* 1000);
      })(i)
    }
    return ;
  }
 // interval < 0
  for (var i=selectedVideos.length-2; i>=0; i--){
    (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
        setTimeout(function(){
          selectedVideos[vindex].seekTo(selectedVideos[vindex].getCurrentTime()- (selectedVideos.length - vindex-1)*-interval);
        },(selectedVideos.length - vindex-1)*-interval* 1000);
    })(i)
  }

}

/**
 * Delay
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} interval - interval
 */
function delay(list,interval){ // interval and video id

  var selectedVideos =  selectVideos(list);
  if(interval>=0){
    for (var i=1; i<selectedVideos.length; i++){
      (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
          setTimeout(function(){
          selectedVideos[vindex].playVideo();
        },vindex*interval* 1000);
      })(i)
      selectedVideos[i].pauseVideo(); // do not need to
    }
    return ;
  }
 // interval < 0
  for (var i=selectedVideos.length-2; i>=0; i--){
    (function(vindex){
        if(DEBUG)console.log("vindex",vindex);
        setTimeout(function(){
          selectedVideos[vindex].playVideo();


        },(selectedVideos.length - vindex-1)*-interval* 1000);
    })(i)
    selectedVideos[i].pauseVideo();
  }

}

/**
 * Sync
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} index - index
 */
function sync(list, index){
    seek(list, targetVideos[index].getCurrentTime());
}

/**
 * Pause the selected videos
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function pause(list){
  var selectedVideos =  selectVideos(list);

  selectedVideos.forEach(function(video){
      video.pauseVideo();
  });
}

/**
 * Play the selected videos
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {string} quality - small, medium, large, hd720, hd1080, highres, or default.
 */
function setQ(list, quality){
  var selectedVideos =  selectVideos(list);

  selectedVideos.forEach(function(video){
      video.setPlaybackQuality(quality);
  });
}

/**
 * Play the selected videos
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function play(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
      video.playVideo();
  });
}

/**
 * Seek to specified time.
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} seconds - time in seconds.
 */
function seek(list, seconds){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
      video.seekTo(seconds,true);
  });
}

/**
 * Loop
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} back - back
 * @param {integer} interval - interval
 * @param {integer} phase - phase
 */
function loop(list,back,interval, phase){
  var selectedVideos =  selectVideos(list);
  if(!phase) phase = 0;
/*  for (var i=0; selectedVideos.length; i++){
    var video = selectedVideos[i];
    var atTime = video.getCurrentTime() - back;
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + i * phase)* 1000);
  }*/
  selectedVideos.forEach(function(video, index){
    var atTime = video.getCurrentTime() - back;
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + index * phase)* 1000);
  });
}
function here(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video, index){
    if(!video.here){
      video.here = video.getCurrentTime();
      return;
    }
    // this is problematic
    loopAt(list,video.here,video.getCurrentTime() - video.here);
    video.here = null;
  });
}

/**
 * LoopAt
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} atTime - atTime
 * @param {integer} interval - interval
 * @param {integer} phase - phase
 */
function loopAt(list,atTime,interval, phase){
  var selectedVideos =  selectVideos(list);
  if(!phase) phase = 0;
/*  for (var i=0; selectedVideos.length; i++){
    var video = selectedVideos[i];
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    (function(v){
      v.loopHandle = setInterval(function(){
        v.seekTo(atTime)
      },(interval + i * phase)* 1000);
    })(video);
  }*/
  selectedVideos.forEach(function(video, index){
    video.seekTo(atTime)
    if(video.loopHandle){
      clearInterval(video.loopHandle);
    }
    video.loopHandle = setInterval(function(){
      video.seekTo(atTime)
    },(interval + index * phase)* 1000);
  });
}

/**
 * Unloop
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 */
function unloop(list){
  var selectedVideos =  selectVideos(list);
  selectedVideos.forEach(function(video){
    if(video.loopHandle){
      clearInterval(video.loopHandle);
      video.loopHandle = null;
    }
  });
}

/**
 * Jump
 * @param {select} videos - See [how to select videos]{@link _howToSelectVideos}.
 * @param {integer} num - num
 * @param {integer} phase - phase
 */
function jump(list,num,phase){
  var selectedVideos =  selectVideos(list);
  if(phase){
    selectedVideos.forEach(function(video){
        video.seekTo(video.getCurrentTime() + num,true);
    });
  }
  else{
    selectedVideos.forEach(function(video, index){
      setTimeout(function(){
        video.seekTo(video.getCurrentTime() + num,true);
      }, phase * index * 1000)
    });
  }
}

function onPlayerStateChange(event) {
  var now = (new Date()).getTime();
  if(DEBUG)$("#state-" + event.target.h.id).text(parseYTState(event.data));
  if(DEBUG&&event.data == YTSTATE_PLAYING){
    console.log("now - jumpTimestamp:", (now - jumpTimestamp));
  }
  if(event.target.initialized && event.data == YTSTATE_PLAYING){
    event.target.initialized = false;
    event.target.pauseVideo();
    event.target.seekTo(0);
    event.target.unMute()
    initialLoading = false;
    targetVideos = [];
    for(var i = 0; i < gridVideos.length; i++)
    {
      targetVideos = targetVideos.concat(gridVideos[i]);
    }
  }

}

function help() {
  var path = '/doc/global.html'
  if (arguments.length == 1) {
    var fName = arguments[0];
    path += '#' + fName;
  }
  console.log(path);
  var win = window.open(path, '_blank');
  win.focus();
}

/**
 * For the most of the methods below, you need to specify which videos to control.
 * There are various ways to select videos.
 * @param {integer} index - Single index of video
 * @param {null|all} all - All the videos
 * @param {integer[]} list - Indices of videos
 * @param {not(indices)} not - All except indices. See [not()]{@link not}
 * @param {string} expression - Condition text (e.g. ">3" or "%2==0")
 */
function _howToSelectVideos() {
}


var ip = 'localhost';
var port = '1234';

var globalLat, globalLon; // temp vars for testing

// attempt a local socket connection
function connectOSC() {
  
    try {
    var socket = new WebSocket("ws://" + ip + ":" + port); 


      console.log('<p class="event">Socket Status: '+socket.readyState);  

          socket.onopen = function(){  
               console.log('<p class="event">Socket Status: '+socket.readyState+' (open)');  
          }  

          socket.onmessage = function(msg){  
              console.log('<p class="message">Received: '+msg.data);
        parseOSCMessage(msg.data);
          }  

          socket.onclose = function(){  
               console.debug('<p class="event">Socket Status: '+socket.readyState+' (Closed)');  
          }             

      } catch(exception){  
           console.log('<p>Error'+exception);  
      }

   // socket.send("hsdfhjkjshd"); 
  
}

function select(videoIndex, resultIndex) {
  var id = searchResult[resultIndex].id.videoId;
  if (videoIndex < targetVideos.length) {
    cue(videoIndex, id)
  } else if (targetVideos.length == 0){
    create(1,1,id);
  } else {
    add(1,0, id);
  }
  $("#youtube-result").hide();
  return;
}

function solo(video) {
  volume(all, 0);
  volume(video, 100);
}

function trigger(id, timepoint, duration) {
	var volumeControl = true;
	var video =  selectVideos(id)[0];	
  	video.seekTo(timepoint);
  	
  	if (video.timeout) {
  		clearTimeout(video.timeout);
  	}
  	if (volumeControl) {
  		video.playVideo();
      var volume;
      if (video.originalVolume == null) {
        volume = video.getVolume();
        video.originalVolume = volume;
      } else {
        volume = video.originalVolume;
      }
      video.setVolume(volume);
  	} else {
  		video.playVideo();
  	}

  	video.timeout = setTimeout(function() {
		if (volumeControl) {
      video.originalVolume = video.getVolume();
			video.setVolume(0);
		} else {
			video.pauseVideo();
		}
  	}, duration);
}


// var token, cmd;
//////////////////////////////////////
// handles incoming websockets messages
function parseOSCMessage(msg) {
  
  if((msg == null) || (msg == "")) 
    return;
  
  var parsed = msg.split("/");
  var func = parsed[1];
  if ((func == null) || (func == "")) 
    return;

  // var params;
  // if(parsed[2]!=null)
  //   params = JSON.parse(parsed[2]);
  var params;
  if(parsed[2]!=null)
    params = parsed[2].replace('[','(').replace(']',')');
  else
    params = "()";

  var command = func + params;
  eval(command);
  
  // token = msg.split("||"); // split into tokens: command + data, data...
  
  // cmd = token[0].split("/");  // split out command: point lat lon
  // if(cmd[1] == "search") {
  //   search(token[1]);
  //   return;
  // } else if(cmd[1] == "select") {
    // var i = parseInt(token[1]);
    // var id = searchResult[i].id.videoId;
    // create(1,1,id);
    // return;
  // } else if(cmd[1] == "play") {
  //   play(0)
  // } else if(cmd[1] == "pause") {
  //   pause(0)
  // }
  // lat = parseFloat(token[1]);
  
} 
