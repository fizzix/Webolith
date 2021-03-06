/*Aerolith 2.0: A web-based word game website
Copyright (C) 2011 Cesar Del Solar
 
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

To contact the author, please email delsolar at gmail dot com*/
// global questions object
var qObj = null;
var CallInterval = 5000;
var IntervalID = 0;
var tableUrl = "";
var username = "";
var csrf_token = "";
var gameGoing = false;
var currentTimer = 0;
var questionLocationHash = {};
var wrongWordsHash = {};
var wrongAlphasHash = {};
var gameTimerID;
var challenge = false;
var tileSizeMap = {10: 14, 11: 13, 12: 12, 13: 11, 14: 10, 15: 10}
var unsavedChanges = false;
var autoSave = false;
var addParams = null;
var defaultTileClass = {on: true, font: 'mono', selection: '1'}; //"tile tileon tilemono tile1";
var defaultBackgroundClass = {showTable: true, showCanvas: true, showBorders: false};
var tileClass = null;
var backgroundClass = null;

var messageTextBoxLimit = 3000; // characters

function disableSelection(target)
{
    if (typeof target.onselectstart!="undefined") //IE route
    {
	    target.onselectstart=function(){return false}
    }
    else if (typeof target.style.MozUserSelect!="undefined")
    { //Firefox route
	    target.style.MozUserSelect="none"
    }
    else //All other route (ie: Opera)
    {
	    target.onmousedown=function(){return false}
    }
    target.style.cursor = "default"
}


function updateMessages(message)
{
    var newMessage = $('#messages').html() + message + '<BR>';
    if (newMessage.length > messageTextBoxLimit)
    {
        newMessage = newMessage.substr(newMessage.length - messageTextBoxLimit);
    }
    $('#messages').html(newMessage); 
    var m = $("#messages");
    m.scrollTop(m[0].scrollHeight - m.height());
}

function updateGuesses(guess)
{
    var newText = $('#guesses').html() + guess + '<BR>';
    if (newText.length > messageTextBoxLimit)
    {
        newText = newText.substr(newText.length - messageTextBoxLimit);
    }
    $('#guesses').html(newText);
    var m = $('#guesses');
    m.scrollTop(m[0].scrollHeight - m.height());
}

function initializeTable(tUrl, u, params)
{
    tableUrl = tUrl;
    username = u;
    addParams = $.parseJSON(params);
    tileClass = defaultTileClass;
    backgroundClass = defaultBackgroundClass;
    if (addParams)
    {
        if('saveName' in addParams)
        {
            $('#saveListName').val(addParams['saveName']);
            autoSave = true;
            updateMessages("Autosave is on! Aerolith will save your list progress at the end of every round.");
        }
        if ('style' in addParams)
        {
            styleObj = $.parseJSON(addParams['style']);
            tileClass = styleObj.tc;
            backgroundClass = styleObj.bc;
        }

    }
    setPrefSelections();
    dontShowTableHandler();
    dontShowCanvasHandler();
    
}

function tileClassToText(tc)
{
    var text = "tile ";
    if (tc.on)
    {
        text += "tileon ";
        text += "tile" + tc.selection + " ";
    }
    else
    {
        text += "tileoff ";
    }    
    if (tc.font == "mono")
        text += "tilemono";
    else if (tc.font == "sans")
        text += "tilesans";
    
    return text;
}

function processQuestionObj(questionObj)
{
    qObj = questionObj;
    var ulBuilder = '<ul id="questionList"><tr>';
    questionLocationHash = {};
    wrongWordsHash = {};
    wrongAlphasHash = {};
    var solutionsTableBuilder = '<table id="solutionsTable"><tr class="header"><td>Prob</td><td>Alphagram</td><td>\<</td>';
    solutionsTableBuilder += '<td>Word</td><td>\></td><td>Definition</td></tr>';
    var tcText = tileClassToText(tileClass);
    for (var i = 0; i < 50; i++)
    {
        var cellStr = "q" + i;
        ulBuilder += '<li id="' + cellStr + '" class="qle">';
        if (i < qObj.length)
        {
            var alphagram = qObj[i]['a'];
            var words = qObj[i]['ws'];
            var numWords = words.length;
            ulBuilder += '<span class="chip chip' + Math.min(numWords, 9) + '">' + numWords + "</span> ";
            ulBuilder += '<span class="tiles">';
            qObj[i]['ahtml'] = '';
            for (var j = 0; j < alphagram.length; j++)
            {
                ulBuilder += '<span class="' + tcText + '">' + alphagram.charAt(j) + '</span>';
                qObj[i]['ahtml'] += '<span class="' + tcText + '">' + alphagram.charAt(j) + '</span>';
            }
            ulBuilder += '</span>';
            questionLocationHash[alphagram] = i;
            
            for (var j = 0; j < numWords; j++)
            {
                if (j == 0)
                {
                    solutionsTableBuilder += '<tr><td>' + qObj[i]['p'] + '</td><td class = "alphagramCell" id="a_' + alphagram + '">';
                    solutionsTableBuilder += alphagram + '</td>';
                }
                else
                    solutionsTableBuilder += '<tr><td></td><td></td>';    // an empty probability & alphagram cell
                
                var word = words[j]['w'];
                solutionsTableBuilder += '<td class="frontHooksCell">' + words[j]['fh'] + '</td>';   // front hooks
                solutionsTableBuilder += '<td class="solutionCell" id="s_' + word + '">' + word + words[j]['s'] + '</td>';    // word + lex symbols
                solutionsTableBuilder += '<td class="backHooksCell">' + words[j]['bh'] + '</td>';   // back hooks
                solutionsTableBuilder += '<td>' + words[j]['d'] + '</td>';  // definition
                solutionsTableBuilder += '</tr>'
                
                // let's also populate the correct words hash (for keeping track of missed questions for display purposes client-side)
                wrongWordsHash[word] = true;       
            }
            wrongAlphasHash[alphagram] = true;     
        }
        ulBuilder += '</li>';
    }
    ulBuilder += '</ul>';
    solutionsTableBuilder += '</table>';
    $("#questions").html(ulBuilder);
    var qlistLIs = $(".qle");
    for (var i = 0; i < 50; i++)
        disableSelection(qlistLIs[i]);
    $("#defs_popup_content").html(solutionsTableBuilder + "<BR>")
    $("#defs_popup_content").css({'visibility': 'hidden'});
    /* change tile sizes depending on length of alphagram */
    for (var i = 0; i < 50; i++)
    {
        var cellSelector = "#q" + i;
        if (i < qObj.length)    // start shrinking tiles
        {
            var alphagram = qObj[i]['a'];
            if (alphagram.length > 9)
            {
                tileSize = tileSizeMap[alphagram.length];
                var tileCssObj = {'width': tileSize + 'px', 
                                'height': tileSize +'px', 
                                'line-height': tileSize + 'px', 
                                'font-size':tileSize*10 + '%'};            
                $(cellSelector + " > span.tiles > span.tile").css(tileCssObj);
            }
           // $("#" + cellStr + " > span.chip").css(tileCssObj);
        
        }
        $(cellSelector).bind('click', {cell: i}, cellClickHandler);

        
    }
    // setup event handlers, etc.
    //IntervalID = setInterval(callServer, CallInterval);

    showBordersHandler();
}

function requestStart()
{
    $("#guessText").focus();
    $.post(tableUrl, {action: "start"}, 
        processStartData, 
        'json');
}

function processStartData(data)
{
    if ('serverMsg' in data)
        updateMessages(data['serverMsg']);
    if ('error' in data)
        updateMessages(data['error']);
    if ('questions' in data)
    {
        processQuestionObj(data['questions']);
    }
    if ('time' in data)
    {
        currentTimer = data['time'] + 1;   // +1 since we're about to call this function
        gameTimerID = window.setInterval(updateTimer, 1000);
        updateTimer();  // call it now too
        gameGoing = true;
    }
    if ('gameType' in data)
    {
        if (data['gameType'] == 'challenge')    challenge = true;
        else challenge = false;
    }
}

function giveUp()
{
    $.post(tableUrl, {action: "giveUp"},
        processGiveUp, 'json');
}

function processGiveUp(data)
{
    if ('g' in data)
    {
        if (!data['g'])
        {
            // quiz is not going anymore!
            processQuizEnded();
        }
    }
}

function updateTimer()
{
    currentTimer--;
    var mins = Math.floor(currentTimer / 60);
    var secs = currentTimer % 60;
    var pad = "";
    if (secs < 10) pad = "0"; 
    $("#gameTimer").text(mins + ":" + pad + secs);
    if (currentTimer == 0)
    {
        window.clearInterval(gameTimerID); 
        $.post(tableUrl, {action: "gameEnded"}, function(data)
        {
            if ('g' in data)
            {
                if (!data['g'])
                    processTimerRanOut();
            }
            
        }, 'json');
    }
}

function textBoxKeyHandler(event)
{
     
  if(event.keyCode == 13)
  {
    var guessText = $(this).val();
    if (guessText.length < 2 || guessText.length > 15) return;   // ignore
    $(this).val("");
    /* should post */
    $.post(tableUrl, {action: "guess", guess: guessText},
            function(data)
            {
                if ('C' in data)
                {
                    if (data['C'] != "")
                    {
                        var loc = questionLocationHash[data['C']];  // data['C'] contains the alphagram of the correct response
                        var cellStr = "#q" + loc;
                        var chipStr = cellStr + ">" + "span.chip";    
                        var numRem = $(chipStr).text();
                        numRem--;
                    
                        if (numRem == 0)
                        {
                            $(cellStr).text("");
                            delete wrongAlphasHash[data['C']];  // this alphagram is not wrong since we solved it
                        }
                        else
                        {
                            $(chipStr).replaceWith('<span class="chip chip' + Math.min(numRem, 9) + '">' + numRem + '</span>');
                        }
                        delete wrongWordsHash[guessText.toUpperCase()];
                        updateGuesses(guessText.toUpperCase());
                    }
                    else
                        updateGuesses('(' + guessText.toUpperCase() + ')'); 

                }                    
                if ('g' in data)
                {
                    if (!data['g'])
                    {
                        // quiz is not going anymore!
                        processQuizEnded();
                    }
                } 
            },
            'json');
  }
}

function processTimerRanOut()
{
    processQuizEnded();
}

function processQuizEnded()
{
    $("#questions").html(""); // clear the table
    $("#gameTimer").text("0:00");   // set the timer display to 0
    window.clearInterval(gameTimerID);  // and stop the timer
    if (challenge)  // only when the challenge is done and not its missed lists.
    {
        updateMessages("The challenge has ended!");
        $.post(tableUrl, {action: "getDcData"}, 
            function(data){
                processDcResults(data, "addlInfo_content");
            }, 'json');
        updateMessages('Click <a href="#" onClick="showAddlInfo()">here</a> to see current results for this challenge.');
    }
    if (autoSave)
    {
        // send save again
        saveGame();
    }
    else
        updateMessages("Autosave is NOT on. To save your progress, type in a name for this list next to the Save button, and click Save.");
    /* highlight all the missed words */
    for (var wrongWord in wrongWordsHash)
    {
        $('#s_' + wrongWord).css({'color': 'red'});
    }
    for (var wrongAlpha in wrongAlphasHash)
    {
        $('#a_' + wrongAlpha).css({'color': 'red'});
    }
    
    
    $("#defs_popup_content").css({'visibility': 'visible'});
    gameGoing = false;
}

function showAddlInfo()
{
	$('#addlInfo_popup').fadeIn();
	
	//Define margin for center alignment (vertical + horizontal) - we add 80 to the height/width to accomodate for the padding + border width defined in the css
	var popMargTop = ($('#addlInfo_popup').height() + 80) / 2;
	var popMargLeft = ($('#addlInfo_popup').width() + 80) / 2;
	
	//Apply Margin to Popup
	$('#addlInfo_popup').css({ 
		'margin-top' : -popMargTop,
		'margin-left' : -popMargLeft
	});
	
	//Fade in Background
	$('#fade').fadeIn(); //Fade in the fade layer 
	
//	return false;
}

function saveGame()
{
    var text = $("#saveListName").val();
    if (!text)
    {
        updateMessages("You must enter a list name for saving!");
    }
    else
    {
        $.post(tableUrl, {action: "save", listname: text},
                function(data) {
                    if ('success' in data)
                    {
                        if (data['success'])
                        {
                            updateMessages("Saved as " + text);
                            if (autoSave == false)
                            {
                                updateMessages("Autosave is now on! Aerolith will save your list progress at the end of " +
                                "every round.");
                                autoSave = true;
                            }
                        }
                    }
                    if ('info' in data)
                    {
                        updateMessages(data['info']);
                    }
                    
                    
                }, 'json');
        
    }
}

function cellClickHandler(event)
{
    var cellIndex = event.data.cell;
    shuffleSingleCell(cellIndex);
    
    var sel;
    if(document.selection && document.selection.empty)
    {
        document.selection.empty();
    } 
    else if(window.getSelection) 
    {
        sel=window.getSelection();
        if (sel && sel.removeAllRanges)
            sel.removeAllRanges();
    }
    $("#guessText").focus();
}

function shuffle()
{
    $("#guessText").focus();
    // cellIndex varies from 0 to 49 inclusive (maybe more in the future)
    for (var i = 0; i < 50; i++)
        shuffleSingleCell(i);
}

function shuffleSingleCell(cellIndex)
{
    var selector = $('#q' + cellIndex + ' > span.tiles > span[class^="tile"]');
    shuffleList(selector);
    $('#q' + cellIndex + ' > span.tiles').html(selector);
}

function alphagram()
{
    $("#guessText").focus();
    for (var i = 0; i < 50; i++)
    {
        if (i < qObj.length)
        {
            $('#q' + i + ' > span.tiles').html(qObj[i]['ahtml']);
        }
    }
    $(".tile").removeClass().addClass(tileClassToText(tileClass));  
}

//shuffles list in-place (from dtm.livejournal.com/38725.html)
function shuffleList(list) 
{
  var i, j, t;
  for (i = 1; i < list.length; i++) {
    j = Math.floor(Math.random()*(1+i));  // choose j in [0..i]
    if (j != i) {
      t = list[i];                        // swap list[i] and list[j]
      list[i] = list[j];
      list[j] = t;
    }
  }
}

function showSolutions()
{
	$('#definitions_popup').fadeIn();
	
	//Define margin for center alignment (vertical + horizontal) - we add 80 to the height/width to accomodate for the padding + border width defined in the css
	var popMargTop = ($('#definitions_popup').height() + 80) / 2;
	var popMargLeft = ($('#definitions_popup').width() + 80) / 2;
	
	//Apply Margin to Popup
	$('#definitions_popup').css({ 
		'margin-top' : -popMargTop,
		'margin-left' : -popMargLeft
	});
	
	//Fade in Background
	$('#fade').fadeIn(); //Fade in the fade layer 
	
//	return false;
}

function customize()
{
    $('#customize_popup').fadeIn();
    var popMargTop = ($('#customize_popup').height() + 80) / 2;
	var popMargLeft = ($('#customize_popup').width() + 80) / 2;
	
	//Apply Margin to Popup
	$('#customize_popup').css({ 
		'margin-top' : -popMargTop,
		'margin-left' : -popMargLeft
	});
	
	// do not fade in background!
//	$('#fade').fadeIn().css({}); //Fade in the fade layer
}

function setupPopupEvent()
{
    // setup definition popup event
    //Close Popups and Fade Layer
    $('a.close, #fade').live('click', function() 
    { //When clicking on the close or fade layer...
      	$('#fade , .popup_block').fadeOut();
    	return false;
    });
}

function dontUseTilesChangeHandler()
{
    if($("#dontUseTiles").attr("checked")==true)
    {
        //alert('checked');
        tileClass.on = false;
    }
    else
    {
        tileClass.on = true;       
    }
    $(".tile").removeClass().addClass(tileClassToText(tileClass));
}

function useSansHandler()
{
    if ($("#useSans").attr("checked")==true)
    {
        tileClass.font = 'sans';
    }
    else
    {
        tileClass.font = 'mono';
    }
    $(".tile").removeClass().addClass(tileClassToText(tileClass));
}

function tileStyleSelectHandler()
{
    tileClass.selection = $("#tileStyleSelect option:selected").val();
    $(".tile").removeClass().addClass(tileClassToText(tileClass));
}

function dontShowTableHandler()
{
    if ($("#dontShowTable").attr("checked")==true)
    {
        backgroundClass.showTable = false;
        $("#questions").removeClass();
    }
    else
    {
        backgroundClass.showTable = true;
        $("#questions").removeClass().addClass("tableBg");
    }
}

function dontShowCanvasHandler()
{
    if ($("#dontShowCanvas").attr("checked")==true)
    {
        backgroundClass.showCanvas = false;
        $("body").removeClass();
    }
    else
    {
        backgroundClass.showCanvas = true;
        $("body").removeClass().addClass("canvasBg");
    }
}

function showBordersHandler()
{
    if ($("#showBorders").attr("checked")==true)
    {
        backgroundClass.showBorders = true;
        $("li").removeClass().addClass("borders");
    }
    else
    {
        backgroundClass.showBorders = false;
        $("li").removeClass().addClass("noborders");
    }
}

function setIndividualCheckmark(searchStr, value, checkedValue)
{
    if (value == checkedValue)
    {
        $(searchStr).attr('checked','checked');
    }
    else
        $(searchStr).removeAttr('checked');
}

function setPrefSelections()
{
    setIndividualCheckmark('#dontUseTiles', tileClass.on, false);
    setIndividualCheckmark('#useSans', tileClass.font, "sans");
    setIndividualCheckmark('#dontShowTable', backgroundClass.showTable, false);
    setIndividualCheckmark('#dontShowCanvas', backgroundClass.showCanvas, false);
    setIndividualCheckmark('#showBorders', backgroundClass.showBorders, true);
    
    $("#tileStyleSelect").val(tileClass.selection);
    
}

function savePrefs()
{
    var jsonPrefs = JSON.stringify({tc: tileClass, bc: backgroundClass});
    $.post(tableUrl, {action: "savePrefs", prefs: jsonPrefs},
               function(data)
               {
                   if (data['success'])
                        $("#prefsInfo").text("Your preferences have been saved.");
                   else
                        $("#prefsInfo").text("Unable to save preferences.");
               },
               'json');
    
    
}

function exit()
{
    window.location = "/wordwalls"; 
}

/* unload page event:

disabling refresh or back is not a good idea in general. to handle refresh/back as cleanly as possible, we must do a few things

- if autosave is on, the game should have been saved as soon as the quiz ended. no need to save again.
    - TODO what happens if the player leaves as the quiz saves?
- if the game is currently going on, the unloader should give up and save the game if autosave is on

it also seems that when closing the browser, sometimes it won't allow outgoing requests. Safari also does not seem to allow outgoing
requests at all on unload! 

so use $.ajax() with the "ASYNC : false" set (according to somebody -- need to test this on various browsers)

                    back        refresh         close tab       close browser
chrome (OSX):        yes        yes                 yes             yes
chrome (win): 
ff (win):            yes                                        seems no.. 
ff (osx):
safari (osx):       yes         yes             yes                 yes
ie (win):                                                           yes 
ff (linux):                                                         yes

opera doesn't work for this event :(

also use onbeforeunload:
http://stackoverflow.com/questions/4376596/jquery-unload-or-beforeunload


Note: windows chrome doesn't post on refresh?!
 */
 
function unloadEventHandler()
{
    if (gameGoing)
    {
        $.ajax({
           url: tableUrl,
           async: false,
           data: {action: "giveUpAndSave", 
                listname: $("#saveListName").val()},
           type: "POST" 
        });
    }
}
