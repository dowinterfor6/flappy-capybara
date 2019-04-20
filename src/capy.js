// A hash of constants that can be changed based on capy sprite hitbox
// and other properties
const CONSTANTS = {
    CAPY_WIDTH: 45,  // Width of capy hitbox DEFAULT 50
    CAPY_HEIGHT: 33, // Height of capy hitbox DEFAULT 38
    GRAVITY: 0.4,    // 'Acceleration' value representing gravity
    FLAP_SPEED: 7.5,   // 'Acceleration' value of a #flap DEFAULT 8
    TERMINAL_VEL: 12, // Maximum velocity the capy can reach
    ANIMATED_FLAP_SPEED: 5
};

export default class Capy {
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
        // ctx.fillRect(this.x, this.y, CONSTANTS.CAPY_WIDTH, CONSTANTS.CAPY_HEIGHT);

        // ctx.drawImage(this.capySprite, this.x, this.y);
        this.capyCounter++;
        let sprite;
        if (this.capyCounter <= (CONSTANTS.ANIMATED_FLAP_SPEED * 1)) {
            sprite = this.capySprite1;
        } else if (this.capyCounter <= (CONSTANTS.ANIMATED_FLAP_SPEED * 2)) {
            sprite = this.capySprite2;
        } else if (this.capyCounter <= (CONSTANTS.ANIMATED_FLAP_SPEED * 3)) {
            sprite = this.capySprite3;
        } else if (this.capyCounter <= (CONSTANTS.ANIMATED_FLAP_SPEED * 4)) {
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
        this.vel += CONSTANTS.GRAVITY;
        
        
        /*
        Logic to determine whether or not to reset the velocity to the terminal
        velocity. Though switch case is not necessary, it is an alternative to 
        if comments, and I prefer the clarity of switch cases.
        */
        if (Math.abs(this.vel) > CONSTANTS.TERMINAL_VEL) {
            switch(this.vel > 0) {
                case true:
                    this.vel = CONSTANTS.TERMINAL_VEL;
                    break;
                case false:
                    this.vel = CONSTANTS.TERMINAL_VEL * -1;
                    break;
            }
        }
    }

    // Simple method that is called whenever there is an appropriate keypress, 
    // and increments the velocity by the FLAP_SPEED
    flap() {
        this.vel = CONSTANTS.FLAP_SPEED * -1;
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
            right: this.x + CONSTANTS.CAPY_WIDTH,
            top: this.y,
            bottom: this.y + CONSTANTS.CAPY_HEIGHT
        };
    }

    /*
    Logic that handles the testing of if the capy has hit the upper and lower bounds of
    the canvas, as given by the dimensions passed into the constructor.
    */
    outOfBounds() {
        const aboveTop = this.y < 0;
        const belowBottom = this.y + CONSTANTS.CAPY_HEIGHT > this.dimensions.height;
        return aboveTop || belowBottom;
    }
}