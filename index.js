//Store user input for future use
var keys=[];
keyPressed=function(){keys[keyCode] = true;};
keyReleased=function(){keys[keyCode] = false;};

//Js keycodes for the arrow buttons
var LEFT_ARROW = 37;
var RIGHT_ARROW = 39;
var UP_ARROW = 38;
var DOWN_ARROW = 40;

//Vector constructor including the math functions needed for raytracing
var Vector = function(x ,y){
    //X and Y components of the vector
    this.x = x;
    this.y = y;

    //Convert the vector to a unit vector with the same direction
    this.normalize = function(){
        var angle = Math.atan2(this.y, this.x);
        this.x = Math.cos(angle);
        this.y = Math.sin(angle);
    }

    //Add two vectors or a vector and a scalar
    this.add = function(other){
        if(!other.x){
            //Scalar
            this.x += other;
            this.y += other;
        }else{
            //Vector
            this.x += other.x;
            this.y += other.y;
        }
    }

    //Subtract two vectors or a vector and a scalar
    this.subtract = function(other){
        if(!other.x){
            //Scalar
            this.x -= other;
            this.y -= other;
        }else{
            //Vector
            this.x -= other.x;
            this.y -= other.y;
        }
    }

    //Multiply two vectors or a vector and a scalar
    this.mult = function(other){
        if(!other.x){
            //Scalar
            this.x *= other;
            this.y *= other;
        }else{
            //Vector
            this.x *= other.x;
            this.y *= other.y;
        }
    }

    //Get the angle of the vector in radians
    this.getAngle = function(){
        return Math.atan2(this.y, this.x);
    }

    //Get the length (magnitude) of the vector
    this.length = function(){
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
}

//Ray constructor. A ray is just two vectors: a position vector and a direction vector
var Ray = function(origin, direction){
    this.origin = origin;
    this.direction = direction;
}

//Globally accessable object for storing all the game data
var gameMap = {
    //String representation of the game world
    data : [
        "11      22          ",
        "1L      L2     1 1 1",
        "    66              ",
        "               2 2 2",
        "  5    5            ",
        "  5  S 5       3 3 3",
        "                    ",
        "    66         4 4 4",
        "4L      L3          ",
        "44      33     5 5 5",
    ],

    //Percentage of the smallest screen dimention for the minimap to be
    miniMapSize : 10,

    //Setup the game. Set the player to spawn and add game colors to the colors object for later lookup
    //Note: you can't define this.colors explicitly in the object because P5 objects are only availible in the setup or draw functions
    setup : function(){
        //Loop through the map data looking for the spawn point character
        for(var y = 0; y < this.data.length; y++){
            for(var x = 0; x < this.data[y].length; x++){
                if(this.data[y][x] === "S"){
                    //Move the player to the spawn point
                    player.pos.x = x;
                    player.pos.y = y;
                }
            }
        }

        //Wall colors + floor gradient colors
        this.colors = {
            "1" : color(230, 230, 230),
            "2" : color(255, 0, 0),
            "3" : color(0, 255, 0),
            "4" : color(0, 0, 255),
            "5" : color(0, 255, 255),
            "6" : color(255, 255, 0),
            floorStart : color(255, 255, 255),
            floorEnd : color(150, 150, 150),
        };
    },

    //Render the minimap
    drawMiniMap : function(){
        //Unit size for the mini map, based on the mini map size and size of the map
        var blockSize = Math.ceil((width / this.miniMapSize) / (this.data.length > this.data[0].length ? this.data.length : this.data[0].length));

        //Slightly transparent background for the map
        fill(0, 0, 0, 50);
        rect(0, 0, this.data[0].length * blockSize, this.data.length * blockSize);

        //Loop through the map and draw walls accordingly
        for(var y = 0; y < this.data.length; y++){
            for(var x = 0; x < this.data[y].length; x++){
                if(parseInt(this.data[y][x])){ //If the map space is a number
                    fill(this.colors[this.data[y][x]]); //Get the relevant color from the color object, and set that as the fill
                }else{
                    //If the map space isn't a number, then it isn't a wall and we don't draw it
                    continue;
                }
                rect(x * blockSize, y * blockSize, blockSize, blockSize); //Draw the wall as a rectangle
            }
        }

        //Draw the player
        push(); //Push the matrix. This makes is so only the code within push() and pop() is effected by the matrix transformations performed (translate, rotate)
            //Draw the player body
            fill(255, 0 , 0);
            rectMode(CENTER); //Draw the rectangles from the center, better for rotation
            translate(player.pos.x * blockSize, player.pos.y * blockSize); //Move the matrix to players location relative to minimap scale
            rotate(player.direction.getAngle()); //Rotate the matrix to the players direction
            rect(0, 0, blockSize / 2, blockSize / 2); //Draw a rectangle at the matrix origin (players minimap position due to the translate)
            //Draw a direction indicator
            strokeWeight(2);
            stroke(255, 0, 0);
            line(0, 0, blockSize / 2, 0);
            //Reset drawing settings
            noStroke(); 
            rectMode(CORNER);
        pop(); //Pop the matrix
    },

    //Find walls hit by ray cast into the virtual space
    getRayCollision : function(ray){
        //Note: This algorithm is my implimentation of a digital differential analyzer (DDA). A DDA calculates the intersections of a line and a grid
        //It is commonly used in graphics to draw lines on a grid of pixels
        //I'm using it to find where the rays hit walls, because the walls are generated on a grid

        //Ray direction deltas
        var dx = ray.direction.x;
        var dy = ray.direction.y;

        //Horizontal offsets
        var xa;
        var ya;

        //Vertical offsets
        var xb;
        var yb;

        //First grid intersections
        var hFirstHit = new Vector(0, 0); //First intersection with a whole number x value
        var vFirstHit = new Vector(0, 0); //First intersection with a whole number y value

        //Angle of the ray
        var angle = ray.direction.getAngle();

        if(dx > 0){ //Ray is moving right
            hFirstHit.x = Math.ceil(ray.origin.x) - ray.origin.x;
            var px = hFirstHit.x;
            hFirstHit.y = Math.tan(angle) * px;
            xa = 1;
            ya = Math.tan(angle) * xa;
        }else if(dx < 0){ //Ray is moving left
            hFirstHit.x = Math.floor(ray.origin.x) - ray.origin.x;
            var px = hFirstHit.x;
            hFirstHit.y = Math.tan(angle) * px;
            xa = -1;
            ya = Math.tan(angle) * xa;
        }

        if(dy > 0){ //Ray is moving down (Coordinate system in P5 has y increasing as you go down the screen, and the origin in the top left)
            vFirstHit.y = Math.ceil(ray.origin.y) - ray.origin.y;
            var py = vFirstHit.y;
            vFirstHit.x = py / Math.tan(angle);
            yb = 1;
            xb = yb / Math.tan(angle);
        }else{ //Ray is moving up
            vFirstHit.y = Math.floor(ray.origin.y) - ray.origin.y;
            var py = vFirstHit.y;
            vFirstHit.x = py / Math.tan(angle);
            yb = -1;
            xb = yb / Math.tan(angle);
        }

        var intersection = hFirstHit;
        var hOffset = new Vector(xa, ya);
        var vOffset = new Vector(xb, yb);
        var hit = null;

        //Horizontal intersections
        if(Math.floor(ray.origin.x) !== Math.floor(ray.origin.x + ray.direction.x)){ //The ray never crosses a horizontal gridline, don't need to check
            while(intersection.length() < ray.direction.length()){ //While we're still checking within the rendering range
                var mapX = xa > 0 ? player.pos.x + intersection.x : player.pos.x + intersection.x - 1; //Find the x coord of grid box hit
                mapX = Math.round(mapX); //Round so to not throw an error when referencing the array
                var mapY = Math.floor(player.pos.y + intersection.y); //Find the y coord of grid box hit
                if(mapY >= 0 && mapY < this.data.length){ //If the grid box is within the y range of the array
                    if(mapX >= 0 && mapX < this.data[mapY].length){ //If the grid box is within the x range of the array
                        var char = this.data[mapY][mapX]; //Character found at collision point in the map
                        if(parseInt(char)){ //If its a number then its a wall
                            hit = { //Create an object to hold data about the hit
                                char: char,
                                distance: intersection.length(),
                                vector: intersection,
                                x: xa,
                                y: ya
                            };
                            break; //Break out of the loop now that we found
                        }
                    }
                }
                intersection.add(hOffset);
            }
        }

        intersection = vFirstHit;

        //Vertical intersections
        //Note: logic is identical for horizontal and vertical intersections
        if(Math.floor(ray.origin.y) !== Math.floor(ray.origin.y + ray.direction.y)){
            while(intersection.length() < ray.direction.length()){
                if(hit != null){
                    if(intersection.length() > hit.distance){
                        break;
                    }
                }
                var mapX = Math.floor(player.pos.x + intersection.x);
                var mapY = yb > 0 ? player.pos.y + intersection.y : player.pos.y + intersection.y - 1;
                mapY = Math.round(mapY);
                if(mapY >= 0 && mapY < this.data.length){
                    if(mapX >= 0 && mapX < this.data[mapY].length){
                        var char = this.data[mapY][mapX];
                        if(parseInt(char)){
                            hit = {
                                char: char,
                                distance: intersection.length(),
                                vector: intersection,
                                x: xb,
                                y: yb
                            };
                            break;
                        }
                    }
                }
                intersection.add(vOffset);
            }
        }

        //Draw hits on the minimap (for debugging)
        if(hit != null){
            /*point((player.pos.x + hit.vector.x) * blockSize, (player.pos.y + hit.vector.y) * blockSize);
            strokeWeight(5);
            stroke(0, 255, 0);
            noStroke();*/
        }

        return hit;
    }
}

//Player object
var player = {
    //Movement variables
    pos : new Vector(0, 0),
    size : 0.1,
    direction : new Vector(1,1),
    speed : 0,
    maxSpeed : 0.05,
    turnSpeed : Math.PI / 100,

    //Screen and rendering variables
    screenWidth : 320,
    screenHeight : 240,
    focalLength : 560,
    fov : Math.PI / 3,
    renderRange : 20,
    scale : 2,

    //Shading variables
    colorMultiplier : 10,

    //Main update loop
    update : function(){
        this.move();
        this.render();
    },

    //Handle movement
    move : function(){
        //Scale the direction vector to represent velocity
        this.direction.normalize();
        this.direction.mult(this.maxSpeed);

        //Turn the direction vector in response to the arrow keys
        var angle = this.direction.getAngle();
        if(keys[RIGHT_ARROW]){
            angle += this.turnSpeed;
        }
        if(keys[LEFT_ARROW]){
            angle -= this.turnSpeed;
        }
        this.direction = new Vector(Math.cos(angle) * this.direction.length(), Math.sin(angle) * this.direction.length());

        //Adjust the speed coefficient in respone to the arrow keys
        if(keys[UP_ARROW]){
            this.speed = 1;
        }else if(keys[DOWN_ARROW]){
            this.speed = -1;
        }else{
            this.speed = 0;
        }

        //Increment the position of the playe and collide with walls
        //Note: You must increment each axis seperately or players won't be able to move along walls, 
        //and other buggy behavior will cause issues
        this.pos.x += this.direction.x * this.speed;
        this.collision(this.direction.x * this.speed, 0);
        this.pos.y += this.direction.y * this.speed;
        this.collision(0, this.direction.y * this.speed);
    },

    //Handle rendering
    render : function(){
        //Render the floor gradient
        //Increment through the quarter of the screen just bellow the "horizon" (middle of the screen) and fill it with a gradient
        for(var y = this.screenHeight * 0.75; y > this.screenHeight / 2; y -= this.scale * 2){
            //Use lerp to get appropriate color for position
            var color = lerpColor(
                gameMap.colors.floorEnd, 
                gameMap.colors.floorStart, 
                (y - this.screenHeight / 2) / (this.screenHeight * 0.25)
            ); 
            fill(color);
            rect(0, Math.round(y), this.screenWidth, -this.scale * 2); //Draw gradient line
        }

        //Render the 3d game map
        //Loop through each column of pixels in the screen
        //Collumn width is defined by this.scale. Scale can be adjusted up to reduce lag
        for(var x = 0; x < this.screenWidth; x += this.scale){
            //X relative to center of the screen 
            var relativeX = -(x - this.screenWidth / 2); 
            //Direction of the ray from the player through the current column of the projection plane
            var rayDirection = new Vector(relativeX, this.focalLength); 
            //Ray angle relative to the player
            var rayAngle = rayDirection.getAngle() + this.direction.getAngle() - Math.PI / 2;
            //Adjust the direction ray to reflect player angle, also normalize the vector
            rayDirection = new Vector(Math.cos(rayAngle), Math.sin(rayAngle));
            //Multiply by the rendering range
            //The gameMap.getRayCollision() method will only check within the length of the ray passed
            rayDirection.mult(this.renderRange);
            var ray = new Ray(this.pos, rayDirection); //Generate a ray from the givens
            var rayCollision = gameMap.getRayCollision(ray); //Get the hit data from the ray
            if(rayCollision === null){ //Ray didn't hit anything
                continue; //Move onto next column
            }
            //Angle of hit relative to viewing angle
            var beta = this.direction.getAngle() - rayCollision.vector.getAngle();
            //Distance adjusted to remove fisheye effect due to flat projection plane
            var distance = rayCollision.distance * Math.cos(beta);
            //Calculate the height of the slice in pixels
            var wallHeight = (1 / distance) * this.focalLength;

            //Draw the wall slice
            noStroke();
            //Get color based on distance (luminance fades with distance) and shadow (based on wall orientation)
            var color = this.getColor(gameMap.colors[rayCollision.char], distance, rayCollision.x); 
            fill(color);
            rect(x, this.screenHeight / 2 - wallHeight / 2, this.scale, wallHeight);
        }
    },

    //Get wall slice color
    getColor : function(c, distance, dx){
        var shadow;
        if(Math.abs(dx) === 1){ //Collision was horizontal
            if(dx > 0){ //Right side of wall
                shadow = 1;
            }else{ //Left side of wall
                shadow = 0.7;
            }
        }else{ //Collision was vertical
            shadow = 0.85;
        }

        //Return a color adjusted for shadow and luminance drop off
        return color(
            Math.min(c.levels[0] / distance * this.colorMultiplier * shadow, c.levels[0] * shadow), 
            Math.min(c.levels[1] / distance * this.colorMultiplier * shadow, c.levels[1] * shadow), 
            Math.min(c.levels[2] / distance * this.colorMultiplier * shadow, c.levels[2] * shadow)
        );
    },

    //Collide the player with walls
    collision : function(dx, dy){
        for(var y = 0; y < gameMap.data.length; y++){ //Loop through the map
            for(var x = 0; x < gameMap.data[y].length; x++){
                if(!parseInt(gameMap.data[y][x])){ //If its not an int, its not a wall
                    continue; //Skip it
                }
                
                //Is the player inside the wall?
                if(this.pos.x > x - this.size && this.pos.x < x + 1 + this.size && this.pos.y > y -this.size && this.pos.y < y + 1 + this.size){
                    if(dx > 0){ //Player moving right
                        this.pos.x = x - this.size; //Push them out to the left
                    }else if(dx < 0){ //Moving left
                        this.pos.x = x + 1 + this.size; //Push them out to the right
                    }

                    if(dy > 0){ //Moving down
                        this.pos.y = y - this.size; //Push them out the top
                    }else if(dy < 0){ //Moving up
                        this.pos.y = y + 1 + this.size; //Push them out the bottom
                    }
                }
            }
        }
    },

    //Set the screen size
    setScreen : function(width, height){
        this.screenWidth = width;
        this.screenHeight = height;
        //Focal length is the distance of the player from the projection plane
        //This is based of the fov angle and the width of the projection plane
        this.focalLength = (this.screenWidth / 2) / Math.tan(this.fov / 2);
    }
}

//P5 setup
function setup(){
    createCanvas(document.body.clientWidth, window.innerHeight); //Create HTML canvas
    player.setScreen(document.body.clientWidth, window.innerHeight); //Adjust projection plane to the new canvas
    gameMap.setup(); //Setup game map
}

//Window resized (Event)
function windowResized() { 
    resizeCanvas(document.body.clientWidth, window.innerHeight); //P5 method to change the html canvas size
    player.setScreen(document.body.clientWidth, window.innerHeight); //Update the player's projection plane
}

//P5 draw loop
function draw(){
    background(255, 255 ,255); //White screen background
    player.update(); //Update the player
    gameMap.drawMiniMap(); //Draw the minimap
}