// Import class and constructor from js file
import FlappyCapy from './game';

// Create constants to grab elements from index
const canvas = document.getElementById("capy-game");

const audioObj = {
    start: document.getElementById("start-audio"),
    gameplay: document.getElementById("gameplay-music"),
    dead: document.getElementById("dead")
};

window.onload = function() {
    setTimeout(() => {
        new FlappyCapy(canvas, audioObj);
    }, 50); //super naive solution to DOM exception error
};

// Create a new game instance and passing in relevant variables
// new FlappyCapy(canvas, audioObj);