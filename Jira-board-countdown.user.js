// ==UserScript==
// @name         Jira board countdown
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add header countdown for the dayly meeting
// @author       Pavel Alexeev <Pahan@Hubbitus.info>
// @include      /^https?:\/\/jira\..+?\/secure\/RapidBoard\.jspa
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hubbitus.info
// @grant        GM_addStyle
// @credits      JavaScript and CSS idea of counter borrowed from https://www.cssscript.com/circular-countdown-timer-javascript-css3/
// @updateURL    https://github.com/Hubbitus/jira-board-countdown.user.js/raw/master/Jira-board-countdown.user.js
// @downloadURL  https://github.com/Hubbitus/jira-board-countdown.user.js/raw/master/Jira-board-countdown.user.js
// ==/UserScript==

/**
* Some content appeared by AJAX loading, after document ready event.
* So, we need wait content when it appeared
* By https://stackoverflow.com/questions/16149431/make-function-wait-until-element-exists/53269990#53269990
**/
async function waitElement(selector) {
    while ( document.querySelector(selector) === null) {
      await new Promise( resolve => requestAnimationFrame(resolve) )
    }
    return document.querySelector(selector);
};

(function() {
    'use strict';

    console.log('Jira board countdown: Hello!');
    AJS.$('nav.aui-header').append(`
<div id="clockdown-container">
<div class="setters">
  <div class="minutes-set">
    <button data-setter="minutes-plus">+</button>
    <button data-setter="minutes-minus">-</button>
  </div>
  <div class="seconds-set">
    <button data-setter="seconds-plus">+</button>
    <button data-setter="seconds-minus">-</button>
  </div>
</div>
<div class="circle">
  <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
     <g transform="translate(110,110)">
        <circle r="100" class="e-c-base"/>
        <g transform="rotate(-90)" style="stroke-width:25">
           <circle r="100" class="e-c-progress" style="stroke-width:25"/>
           <g id="e-pointer" style="stroke-width:25">
              <circle cx="100" cy="0" r="18" class="e-c-pointer" style="stroke-width:15" />
           </g>
        </g>
     </g>
  </svg>
</div>
<div class="controlls">
  <div class="display-remain-time">02:00</div>
  <button class="play" id="play_pause"></button>
  <button id="countdown-reset" title="Reset rimer">⭯</button>
</div>
</div>
    `);
    GM_addStyle(`
button[data-setter] {
  outline: none;
  background: transparent;
  border: none;
  font-family: 'Roboto';
  font-weight: 300;
  font-size: 18px;
  width: 25px;
  height: 30px;
  color: #a3c644;
  cursor: pointer;
}
button[data-setter]:hover { opacity: 0.5; }
.setters {
  position: absolute;
  left: 85px;
  top: 75px;
}
.minutes-set {
  float: left;
  margin-right: 28px;
}
.seconds-set { float: right; }
.controlls {
/*  position: absolute; */
  left: 75px;
  top: 105px;
  text-align: center;
}
.display-remain-time {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Fira Sans, Helvetica Neue, sans-serif;
  font-weight: 400;
  font-size: 2em;
  color: #a3c644;
}
#play_pause {
  outline: none;
  background: transparent;
  border: none;
  position: relative;
}
#countdown-reset {
  outline: none;
  background: transparent;
  border: none;
  color: #a3c644;
  line-height: 1;
  position: relative;
  padding-left: 0;
}
.play::before {
  display: block;
  content: "⏵";
  color: #a3c644;
}
.pause::after {
  content: "⏸";
  color: #a3c644;
}

#play_pause:hover { opacity: 0.8; }
.e-c-base {
  fill: none;
  stroke: #a3c644;
  stroke-width: 4px
}
.e-c-progress {
  fill: none;
  stroke: #a3c644;
  stroke-width: 4px;
  transition: stroke-dashoffset 0.7s;
}
.e-c-pointer {
  fill: #FFF;
  stroke: #056b00;
  stroke-width: 2px;
}
#e-pointer { transition: transform 0.7s; }

/* ++??++ */
.setters { display: none; }
#clockdown-container, .controlls { display: flex; }
.circle { padding-left: 0.5em; }
.low-mark { color: #8d2c20;}
    `);

    // FROM https://www.cssscript.com/circular-countdown-timer-javascript-css3/
    //circle start
    let progressBar = document.querySelector('.e-c-progress');
    let indicator = document.getElementById('e-indicator');
    let pointer = document.getElementById('e-pointer');
    let length = Math.PI * 2 * 100;
    progressBar.style.strokeDasharray = length;
    function update(value, timePercent) {
        var offset = - length - length * value / (timePercent);
        progressBar.style.strokeDashoffset = offset;
        pointer.style.transform = `rotate(${360 * value / (timePercent)}deg)`;
    };
    //circle ends
    const displayOutput = document.querySelector('.display-remain-time')
    const playPauseBtn = document.getElementById('play_pause');
    const setterBtns = document.querySelectorAll('button[data-setter]');
    const countdownResetBtn = document.getElementById('countdown-reset');
    let intervalTimer;
    let timeLeft;
    let wholeTime = 2 * 60; // manage this to set the whole time
    let isPaused = false;
    let isStarted = false;

    update(wholeTime,wholeTime); //refreshes progress bar
    displayTimeLeft(wholeTime);
    function changeWholeTime(seconds){
        if ((wholeTime + seconds) > 0){
            wholeTime += seconds;
            update(wholeTime,wholeTime);
        }
    }
    for (var i = 0; i < setterBtns.length; i++) {
        setterBtns[i].addEventListener("click", function(event) {
            var param = this.dataset.setter;
            switch (param) {
                case 'minutes-plus':
                    changeWholeTime(1 * 60);
                    break;
                case 'minutes-minus':
                    changeWholeTime(-1 * 60);
                    break;
                case 'seconds-plus':
                    changeWholeTime(1);
                    break;
                case 'seconds-minus':
                    changeWholeTime(-1);
                    break;
            }
            displayTimeLeft(wholeTime);
        });
    }
    function timer (seconds){ //counts time, takes seconds
        let remainTime = Date.now() + (seconds * 1000);
        displayTimeLeft(seconds);

        intervalTimer = setInterval(function(){
            timeLeft = Math.round((remainTime - Date.now()) / 1000);
            if(timeLeft < 0){
                clearInterval(intervalTimer);
                isStarted = false;
                setterBtns.forEach(function(btn){
                    btn.disabled = false;
                    btn.style.opacity = 1;
                });
                displayTimeLeft(wholeTime);
                playPauseBtn.classList.remove('pause');
                playPauseBtn.classList.add('play');
                return ;
            }
            displayTimeLeft(timeLeft);
        }, 1000);
    }
    function pauseTimer(event){
        if(isStarted === false){
            timer(wholeTime);
            isStarted = true;
            this.classList.remove('play');
            this.classList.add('pause');

            setterBtns.forEach(function(btn){
                btn.disabled = true;
                btn.style.opacity = 0.5;
            });
        }else if(isPaused){
            this.classList.remove('play');
            this.classList.add('pause');
            timer(timeLeft);
            isPaused = isPaused ? false : true
        }else{
            this.classList.remove('pause');
            this.classList.add('play');
            clearInterval(intervalTimer);
            isPaused = isPaused ? false : true;
        }
    }
    function resetTimer(){
        playPauseBtn.classList.remove('pause');
        playPauseBtn.classList.add('play');
        clearInterval(intervalTimer);
        isStarted = false;
        isPaused = false;
        timeLeft = wholeTime;
        displayTimeLeft(timeLeft);
    }
    function displayTimeLeft (timeLeft){ //displays time on the input
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        let displayString = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        displayOutput.textContent = displayString;
        if (0 == minutes && seconds <= 10){
            displayOutput.classList.add('low-mark');
        }
        else {
            displayOutput.classList.remove('low-mark');
        }
        update(timeLeft, wholeTime);
    }
    playPauseBtn.addEventListener('click', pauseTimer);

    countdownResetBtn.addEventListener('click', function(){resetTimer()});

    waitElement('#js-work-quickfilters').then(filtersPanel => {
        console.log('Jira board countdown: filter dd`s', filtersPanel.querySelectorAll('dd'));
        filtersPanel.querySelectorAll('dd').forEach(it => it.addEventListener('click', function(){
            console.log('Jira board countdown: Filter changed! New location:', window.location);
            resetTimer();
            playPauseBtn.click();
        }));
    });
})();
