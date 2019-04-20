// Import capy and level
import Capy from "./capy";
import Level from "./level";

export default class FlappyCapy {
    /* 
    Constructor function that will start a 2d drawing context,
    instantiate dimensions of the canvas context,
    start an event listener for mouse clicks (implement space bar later),
    and start the game loop.
    */
   constructor(canvas, audioObj) {
       this.ctx = canvas.getContext("2d");
       this.dimensions = { width: canvas.width, height: canvas.height };
       this.audioObj = audioObj;
       this.registerEvents();
       this.restart();
    }
    
    /*
    Animation of the Game instance that calls the animation of
    the Capy and Level instances, within this context.
    */
    animate() {
        this.level.animate(this.ctx);
        /* 
        After animating all the instances, #gameOver will be called
        which will return the user to the starting frame of the game
        via #restart if needed.
        */
        if (this.gameOver()) {
            // this.audioObj.dead.play(); Why doesn't this play before alert?
            alert(`What a scrub, you only got ${this.score} points`);
            // this.gameOverScreen(); // need to implement 'pause' on game over
            this.restart();
        }
        
        // Simple method to increment score whenever a pipe is passed
        this.level.passedPipe(this.capy.bounds(), () => {
            this.score ++;
        });
        
        // Display score
        this.drawScore();
        
        /*
        Unless the game is over, run #animate via callback while
        binding this Game instance. #requestAnimationFrame will only
        call #callback according to standard refresh rate, e.g. 60fps
        */
       if (this.running) {
           this.audioObj.start.pause();
           this.audioObj.gameplay.play();
           requestAnimationFrame(this.animate.bind(this));
        }
    }
    
    animateLevelBackground() {
        this.level.drawBackground(this.ctx);
        this.level.animateBackground(this.ctx);
        if (this.running) {
            this.capy.moveCapy();
        }
        this.capy.drawCapy(this.ctx);
        requestAnimationFrame(this.animateLevelBackground.bind(this));
    }
    /*
    Displays the current score of the Game by drawing on the current context
    and filling in the strings with interpolated values. 
    */
    drawScore() {
        const loc = { x: 10, y: 60 };
        this.ctx.font = "bold 50pt serif";
        this.ctx.fillStyle = "white";
        this.ctx.fillText(`Score: ${this.score}`, loc.x, loc.y);
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(`Score: ${this.score}`, loc.x, loc.y);
    }

    // Starts off the game state and runs the initial #animate call
    play() {
        this.running = true;
        this.animate();
    }

    /*
    Whenever the game is over, this method will be invoked to reset
    game state and create new Level and Capy instances, as well as
    resetting the score and calling #animate
    */
    restart() {
        this.audioObj.gameplay.currentTime = 0;
        this.audioObj.gameplay.pause();
        this.audioObj.start.currentTime = 0;
        this.audioObj.start.play();
        this.running = false;
        this.level = new Level(this.dimensions);
        this.capy = new Capy(this.dimensions);
        // Ensure capysprite is loaded when window first loads
        // Ensure level animated background elements are loaded when window first loads
        // Only need to run once
        if (!this.backgroundRunning) {
            this.animateLevelBackground();
            this.backgroundRunning = true;
        }
        this.score = 0;
        this.animate();
    }
    
    /*
    Event handler method that will determine what the keypress will
    do. #click can take a variable, but is not used in this case.
    If the game is not running, e.g. first keypress after #gameOver or 
    page load has not been made, it will #play the game.
    The capy will #flap per keypress.
    NOTE: This method isn't actually necessary right now, it can be 
    incorporated within the callback in #registerEvents
    */
    /*
    click(e) {
        if (!this.running) {
            this.play();
        }
        this.capy.flap();
    }
    */

    /*
    Add event listener to the page, attached to the canvas in this Game instance,
    listening to a "mousedown" action and having a callback of what #click would do.

    NOTE: #click could be called as an instance variable invoked method, 
    binding this Game instance to it, and passed into the callback instead, e.g.
    this.boundClickHandler = this.click.bind(this);
    this.ctx.canvas.addEventListener("mousedown", this.boundClickHandler);
    */
    registerEvents() {
        this.ctx.canvas.addEventListener("mousedown", () => {
            if (!this.running) {
                this.play();
            }
            this.capy.flap();
        });
        this.backgroundRunning = false;
    }

    /*
    Returns whether or not the capy has hit one of the pipes or
    the upper/lower boundaries of the Level
    */
    gameOver() {
        return (this.level.collidesWith(this.capy.bounds()) || this.capy.outOfBounds());
    }

    // gameOverScreen() {
    //     this.screenText();
    // }

    // screenText() {
    //     let loc = { x: this.dimensions.width / 2, y: this.dimensions.height / 2 };
    //     this.ctx.font = "50pt serif";
    //     this.ctx.fillStyle = "white";
    //     this.ctx.fillText(`Click to start playing Flappy Capybara!`, loc.x, loc.y);
    //     // this.ctx.strokeStyle = "black";
    //     // this.ctx.lineWidth = 2;
    //     // this.ctx.strokeText(`Score: ${this.score}`, loc.x, loc.y);
    // }
}