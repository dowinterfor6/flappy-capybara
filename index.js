// Create constants to grab elements from index
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("capy-game");
    
    const audioObj = {
        start: document.getElementById("start-audio"),
        gameplay: document.getElementById("gameplay-music"),
        dead: document.getElementById("dead")
    };
    
    new FlappyCapy(canvas, audioObj);
});

//---------------------------------------------------------------------//

// A hash of level constants that can be changed to adjust game difficulty
const CONSTANTS = {
    HORIZONTAL_PIPE_SPACING: 220, // Space between pipes on x axis
    PIPE_GAP: 150,                // Space between top and bottom pipes, was 150
    WARMUP_SECONDS: 1,            // Time between first click and first pipe appearing
    EDGE_BUFFER: 50,              // Distance between the level bounds and gap extremes
    PIPE_WIDTH: 50,               // Width of the pipe hitbox
    PIPE_SPEED: 2,                // Frequency of pipe spawn
    PIPE_IMAGE_HEIGHT: 640,        // Vertical dimension of image source
    BACKGROUND_SPEED: 1
};

class Level {
    /*
    Constructor function that sets the dimensions of the Level instance, and
    handles the pipe logic. Pipe spawns will be kept track of in an array (ideally
    a queue, but JS does not have a queue object natively), where the first pipe
    will be added after the warmup time passes, and subsequent pipes are added 
    at a fixed horizontal distance away, as defined by constants hash
    */
    constructor(dimensions) {
        this.dimensions = dimensions;

        const firstPipeDistance = this.dimensions.width + (CONSTANTS.WARMUP_SECONDS * 60 * CONSTANTS.PIPE_SPEED);

        this.pipes = [
            this.randomPipe(firstPipeDistance),
            this.randomPipe(firstPipeDistance + CONSTANTS.HORIZONTAL_PIPE_SPACING),
            this.randomPipe(firstPipeDistance + (2 * CONSTANTS.HORIZONTAL_PIPE_SPACING))
        ];

        let backgroundFirst = this.makeBackground();
        this.backgroundQueue = [backgroundFirst];
        this.appendBackground = true;
    }

    makeBackground() {
        const background = {
            image: new Image(),
            pos: (480 - 1920)
        };
        if (this.appendBackground) {
            background.pos = 480;
            this.appendBackground = false;
        }
        background.image.src = 'assets/images/background-sky-and-grass.png';
        return background;
    }

    /*
    #animate that takes in context given by the game, and proceeds
    to draw the background and pipes element onto the canvas.
    #movePipes is called before it is drawn in order for the visible 
    pipes to more accurately reflect the current location, e.g. if #movePipes
    is called after #drawPipes, the visible pipes will actually represent the
    previous position of the pipes in the last event loop cycle (1 frame ago).
    */
    animate(ctx) {
        // this.drawBackground(ctx);
        // this.animateBackground(ctx);
        this.movePipes();
        this.drawPipes(ctx);
    }

    animateBackground(ctx) {
        this.moveAnimatedBackground();
        this.drawAnimatedBackground(ctx);
    }

    /*
    Pipes are drawn onto the canvas with #fillRect and colored with #fillStyle,
    which will be replaced by actual images at a later time, using #drawImage or 
    whatever the method is called, positioned for each pipe.
    */
    drawPipes(ctx) {
        this.eachPipe(function (pipe) {
            let pipeOffsetTop = pipe.topPipe.bottom - pipe.topPipe.top;
            let pipeOffsetBottom = pipe.bottomPipe.bottom - pipe.bottomPipe.top;

            let topPipeRender = new Image();
            topPipeRender.src = 'assets/images/top-pipe.png';
            ctx.drawImage(topPipeRender, pipe.topPipe.left, pipeOffsetTop - CONSTANTS.PIPE_IMAGE_HEIGHT);

            let bottomPipeRender = new Image();
            bottomPipeRender.src = 'assets/images/bottom-pipe.png';
            ctx.drawImage(bottomPipeRender, pipe.bottomPipe.left, CONSTANTS.PIPE_IMAGE_HEIGHT - pipeOffsetBottom);
        });
    }

    /*
    Logic that moves each pipe across the screen. Pipe speed is determined by the
    constants hash defined earlier, and will be placed in a callback called by #eachPipe.
    #eachPipe is necessary to properly retain 'this' when iterating through the pipes
    as it will be used for various functions.
    */
    movePipes() {
        this.eachPipe(function (pipe) {
            pipe.topPipe.left -= CONSTANTS.PIPE_SPEED;
            pipe.topPipe.right -= CONSTANTS.PIPE_SPEED;
            pipe.bottomPipe.left -= CONSTANTS.PIPE_SPEED;
            pipe.bottomPipe.right -= CONSTANTS.PIPE_SPEED;
        });

        /*
        Whenever a pipe completely passes out of the dimensions of the canvas
        it should be shifted from the array and a new, randomly generated pair
        of pipes should be pushed into the array. Unfortunately, JS does not
        have #first and #last methods for array indices. 
        */
        if (this.pipes[0].topPipe.right <= 0) {
            this.pipes.shift();
            /*
            This constant is assigned the extra distance in which the new pipe must be created
            away from the last pipe in order to retain consistent spacing
            */
            const newXOffset = this.pipes[1].topPipe.left + CONSTANTS.HORIZONTAL_PIPE_SPACING;
            this.pipes.push(this.randomPipe(newXOffset));
        }
    }

    moveAnimatedBackground() {
        switch (this.backgroundQueue[0].pos) {
            // When first image right edge is at canvas right edge
            case (480 - 1920):
                this.backgroundQueue.push(this.makeBackground());
                this.appendBackground = true;
                break;
            // When first image right edge is at canvas left edge
            case (-1920):
                this.backgroundQueue.shift();
                break;
        }
        this.backgroundQueue.forEach((background) => {
            background.pos -= CONSTANTS.BACKGROUND_SPEED;
        });
    }

    /*
    A simple background is drawn onto the context with a color, and 
    fills up the entire page.
    */
    drawBackground(ctx) {
        ctx.fillStyle = "skyblue";
        ctx.fillRect(0, 0, this.dimensions.width, this.dimensions.height);
    }

    drawAnimatedBackground(ctx) {
        this.backgroundQueue.forEach((background) => {
            ctx.drawImage(background.image, background.pos, 0);
        });
    }

    /*
    Custom iteration method that binds 'this' to the Level instance
    instead of allowing it to become something else
    */
    eachPipe(callback) {
        this.pipes.forEach(callback.bind(this));
    }

    /*
    Logic that handles the collision with Capy instance. Whenever the hitbox of
    the Capy instance exceeds the dimensions of the pipe (e.g. colliding with it)
    the collision instance variable will be set to true, otherwise defaulting to false.
    */
    collidesWith(capyBound) {
        /*
        Instance invoked fat arrow method that will store a boolean result of
        the collision between a pipe instance and capy.
        */
        const _overlap = (pipe, capy) => {
            if (pipe.left > capy.right || pipe.right < capy.left) {
                return false;
            }
            if (pipe.top > capy.bottom || pipe.bottom < capy.top) {
                return false;
            }
            return true;
        };

        // Default value of collision as false, which will not be changed unless
        // a collision is detected.
        let collision = false;

        /*
        An iteration through each pipe calling on the _overlap variable invoked method
        to determine if a collision has occured. Since each pair of pipes is made of two
        individual pipes, the top and bottom pipes will have to be taken into account when
        checking for collision.
        */
        this.eachPipe((pipe) => {
            if (_overlap(pipe.topPipe, capyBound) || _overlap(pipe.bottomPipe, capyBound)) {
                collision = true;
            }
        });
        return collision;
    }

    /*
    Logic to check whether or not a capy has passed the pipe obstacle.
    Through the game script, a simple callback that increments the score is passed
    into this method to be called whenever a pipe is cleared.
    Note that any pipe within the array can be considered, but since the capy has no
    horizontal movement relative to the canvas each pipe will only be passed once,
    so it is okay to iterate through all pipes in the array, every single time
    the method is being called
    */
    passedPipe(capy, callback) {
        this.eachPipe((pipe) => {
            if (pipe.topPipe.right < capy.left) {
                if (!pipe.passed) {
                    pipe.passed = true;
                    callback();
                }
            }
        });
    }

    /*
    The generator for pipes, given an input distance. While a simple game can memo-ize this
    method and others by always having a fixed distance, this allows for greater flexibility in
    designing variations in the game constants. A heightRange instance variable is set to be within 
    the edge buffers such that the gap will never be at the vertical extremes of the canvas.
    Since gap distance is defined in the constants, only one reference to the gap is needed, in this
    case the topOfGap is chosen. 
    A POJO is created and returned with the appropriate dimensions
    */
    randomPipe(distance) {
        const heightRange = this.dimensions.height - (2 * CONSTANTS.EDGE_BUFFER) - CONSTANTS.PIPE_GAP;
        const topOfGap = (Math.random() * heightRange) + CONSTANTS.EDGE_BUFFER;
        const pipe = {
            topPipe: {
                left: distance,
                right: CONSTANTS.PIPE_WIDTH + distance,
                top: 0,
                bottom: topOfGap
            },
            bottomPipe: {
                left: distance,
                right: CONSTANTS.PIPE_WIDTH + distance,
                top: topOfGap + CONSTANTS.PIPE_GAP,
                bottom: this.dimensions.height
            },
            passed: false
        };
        return pipe;
    }
}

//---------------------------------------------------------------------//

// A hash of constants that can be changed based on capy sprite hitbox
// and other properties
const CONST = {
    CAPY_WIDTH: 45,  // Width of capy hitbox DEFAULT 50
    CAPY_HEIGHT: 33, // Height of capy hitbox DEFAULT 38
    GRAVITY: 0.4,    // 'Acceleration' value representing gravity
    FLAP_SPEED: 7.5,   // 'Acceleration' value of a #flap DEFAULT 8
    TERMINAL_VEL: 12, // Maximum velocity the capy can reach
    ANIMATED_FLAP_SPEED: 5
};

class Capy {
    /*
    Constructor function that sets the appropriate dimensions of the canvas,
    as well as the position of the capy relative to the canvas. The velocity
    is initialized to be 0 to indicate the stopped value.
    */
    constructor(dimensions) {
        this.dimensions = dimensions;
        this.x = dimensions.width / 3;
        this.y = dimensions.height / 2;
        this.vel = 0;
        this.capyCounter = 0;

        // Memo-ize capy image so it doesn't need to load everytime #drawCapy is called
        //    this.capySprite = new Image();
        //this.capySprite.src = 'assets/images/capy-sprite-small.png';
        //this.capySprite.src = 'assets/images/capy-sprite-gif.gif';
        //    this.capySprite.src = 'assets/images/capy-sprite-sheet.png';
        this.capySprite1 = new Image();
        this.capySprite2 = new Image();
        this.capySprite3 = new Image();
        this.capySprite1.src = 'assets/images/capy-wings1.png';
        this.capySprite2.src = 'assets/images/capy-wings2.png';
        this.capySprite3.src = 'assets/images/capy-wings3.png';
    }

    /*
    Animation function that takes in the canvas and #moveCapy before drawing
    it on the canvas for rendering
    */
    animate(ctx) {
        this.moveCapy();
        this.drawCapy(ctx);
    }

    /*
    Capy is represented as a capysprite, but the hitbox is inaccurate
    */
    drawCapy(ctx) {
        // ctx.fillStyle = "yellow";
        // ctx.fillRect(this.x, this.y, CONST.CAPY_WIDTH, CONST.CAPY_HEIGHT);

        // ctx.drawImage(this.capySprite, this.x, this.y);
        this.capyCounter++;
        let sprite;
        if (this.capyCounter <= (CONST.ANIMATED_FLAP_SPEED * 1)) {
            sprite = this.capySprite1;
        } else if (this.capyCounter <= (CONST.ANIMATED_FLAP_SPEED * 2)) {
            sprite = this.capySprite2;
        } else if (this.capyCounter <= (CONST.ANIMATED_FLAP_SPEED * 3)) {
            sprite = this.capySprite3;
        } else if (this.capyCounter <= (CONST.ANIMATED_FLAP_SPEED * 4)) {
            this.capyCounter = 0;
            sprite = this.capySprite2;
        }
        ctx.drawImage(sprite, this.x, this.y);
    }

    /*
    Capy is adjusted according to y position based on current velocity, and the 
    effects of gravity is added to the velocity for the next update in position.
    Capy rotation can be added later, with a max range to represent a parabolic 
    function's tangent at a certain position.
    */
    moveCapy() {
        this.y += this.vel;
        this.vel += CONST.GRAVITY;


        /*
        Logic to determine whether or not to reset the velocity to the terminal
        velocity. Though switch case is not necessary, it is an alternative to 
        if comments, and I prefer the clarity of switch cases.
        */
        if (Math.abs(this.vel) > CONST.TERMINAL_VEL) {
            switch (this.vel > 0) {
                case true:
                    this.vel = CONST.TERMINAL_VEL;
                    break;
                case false:
                    this.vel = CONST.TERMINAL_VEL * -1;
                    break;
            }
        }
    }

    // Simple method that is called whenever there is an appropriate keypress, 
    // and increments the velocity by the FLAP_SPEED
    flap() {
        this.vel = CONST.FLAP_SPEED * -1;
    }

    /*
    Method that returns a POJO containing the capy hitbox, for use when determining
    if the capy has hit out of bounds, or one of the pipes. 
    When using a custom sprite, the hitboxes may be a little off, and different extremes
    may potentially be a better choice.
    An elliptical/circle function may be used to determine appropriate bounds
    */
    bounds() {
        return {
            left: this.x,
            right: this.x + CONST.CAPY_WIDTH,
            top: this.y,
            bottom: this.y + CONST.CAPY_HEIGHT
        };
    }

    /*
    Logic that handles the testing of if the capy has hit the upper and lower bounds of
    the canvas, as given by the dimensions passed into the constructor.
    */
    outOfBounds() {
        const aboveTop = this.y < 0;
        const belowBottom = this.y + CONST.CAPY_HEIGHT > this.dimensions.height;
        return aboveTop || belowBottom;
    }
}

//---------------------------------------------------------------------//

class FlappyCapy {
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
            this.score++;
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
        this.ctx.font = "bold 40pt sans-serif";
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