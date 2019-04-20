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

export default class Level {
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
            pos: (480-1920)
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
        this.eachPipe(function(pipe) {
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
        this.eachPipe(function(pipe) {
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
            case (480-1920):
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