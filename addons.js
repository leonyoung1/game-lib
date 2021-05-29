//================= GAME OBJECT MODS =======================

(function () {
  this.intersects = function (objects, ratio, callback) {
    //checks if callback is second parameter
    if (ratio !== undefined && typeof ratio === 'function') {
      callback = ratio;
      ratio = 1;
    }
    //if objects is not an arry
    if (!Array.isArray(objects)) {
      if (this.overlap(objects, ratio)) {
        if (callback) {
          callback(obj);
        }
        return true;
      }
      else return false;
    }
    //if objects is an array
    this.intersectObject = null;
    for (let obj of objects) {
      //find first collision
      if (this.overlap(obj, ratio)) {
        this.intersectObject = obj;
        if (callback) {
          callback(obj);
          clean(objects);
        }
        return true;
      }
    }
    return false;
  };

  this.overlap = function (otherObj, ratio) {
    if (!otherObj) {
      return false;
    }
    
    if (!this.active) {
      return false;
    }

    if (ratio === undefined) {
      ratio = 1;
    }
    if (ratio < 0.001 || (!otherObj.active && !otherObj.tilemap)) {
      return false;
    }

    let a = this.getBounds();
    let b = otherObj.getBounds();
    //Resize bounding box based on ratio
    if (ratio != 1) {
      a.width *= ratio;
      a.height *= ratio;
      a.centerX = this.x;
      a.centerY = this.y;

      b.width *= ratio;
      b.height *= ratio;
      b.centerX = otherObj.x;
      b.centerY = otherObj.y;
    }
    return Phaser.Geom.Intersects.RectangleToRectangle(a, b);
  };

  this.enableClick = function (onClick, context) {
    this.setInteractive();
    this._justClicked = false;
    this._justReleased = false;
    this._pointerOver = false;
    this._context = (context === undefined) ? this.scene : context;

    this.wasClicked = function () {
      if (this._justClicked) {
        this._justClicked = false;
        return true;
      }
      return false;
    };

    this.wasReleased = function () {
      if (this._justReleased) {
        this._justReleased = false;
        return true;
      }
      return false;
    };

    this.isClicked = function () {
      return (this._pointerOver && this.scene.input.activePointer.isDown)
    };

    this.isOver = function () {
      return this._pointerOver;
    }

    this.disableClick = function () {
      return this.disableInteractive();
    }
    this.on('pointerover', function (pointer) {
      this._pointerOver = true;
    }, this);

    this.on('pointerout', function (pointer) {
      this._pointerOver = false;
    }, this);

    this.on("pointerdown", function (pointer) {
      this._justClicked = true;
    }, this);

    this.on("pointerup", function (pointer) {
      this._justReleased = true;
    }, this);

    if (onClick) {
      this.on("pointerdown", onClick, this._context);
    }
  };

  this.enableDrag = function () {
    this.setInteractive();

    this._dropped = false;
    this._dragging = false;
    this.scene.input.setDraggable(this);
    this.on('dragstart', function (pointer) {
      this._dropped = false;
      this._dragging = true;
    });
    this.on('drag', function (pointer, dragX, dragY) {
      this.setPosition(dragX, dragY);
    });
    this.on('dragend', function (pointer) {
      this._dragging = false;
      this._dropped = true;
    });

    this.isDragging = function () {
      return this._dragging;
    };

    this.wasDropped = function () {
      if (this._dropped) {
        this._dropped = false;
        return true;
      }
      return false;
    };
  };

  this.disableDrag = function () {
    this.scene.input.setDraggable(this, false);
  }

  //Vector2 deals with radians we should use radians 
  this.getAngleOffset = function (orientation) {
    if (typeof orientation === 'string') {
      switch (orientation.toLowerCase()) {
        case "up":
          return Math.PI * 0.5;
        case "left":
          return Math.PI;
        case "down":
          return Math.PI * 1.5;
        default:
          return 0;
      }
    }
    return 0;
  };

  this.enableVectorControls = function (speed, orientation) {
    this.setOrientation = function (orientation) {
      this.angleOffset = this.getAngleOffset(orientation);
      return this;
    }
    this.setSpeed = function (speed) {
      this.vector.setLength(speed);
      return this;
    }

    this.setOrientation(orientation);
    this.vector = new Phaser.Math.Vector2(speed ? speed : 1, 0);

    this.prevX = this.x;
    this.prevY = this.y;

    this.turnRight = function (degrees) {
      this.angle += degrees === undefined ? 5 : degrees;
    };

    this.turnLeft = function (degrees) {
      this.angle -= degrees === undefined ? 5 : degrees;
    };

    this.moveForward = function () {
      this.prevX = this.x;
      this.prevY = this.y;
      this.vector.setAngle(this.rotation - this.angleOffset);
      this.x += this.vector.x;
      this.y += this.vector.y;
    };

    this.moveBack = function () {
      this.prevX = this.x;
      this.prevY = this.y;
      this.vector.setAngle(this.rotation - this.angleOffset);
      this.x -= this.vector.x;
      this.y -= this.vector.y;
    };

    this.bounce = function () {
      this.x = this.prevX;
      this.y = this.prevY;
    }
  };

  this.enableTrackingControls = function (speed, orientation) {
    this.setOrientation = function (orientation) {
      if (orientation === undefined) orientation = this.flipX ? "left" : "right";
      this.angleOffset = this.getAngleOffset(orientation);
      this.orientation = orientation.toLowerCase();
      return this;
    }
    this.setSpeed = function (speed) {
      this.vector.setLength(speed);
      return this;
    }

    this.setOrientation(orientation);
    this.vector = new Phaser.Math.Vector2(speed ? speed : 1, 0);

    this.distance = 0;

    this.xTarget = this.x;
    this.yTarget = this.y;

    this.prevX = this.x;
    this.prevY = this.y;

    this.setTarget = function (x, y, rotate) {
      if (rotate === undefined) {
        rotate = true;
      }

      // Triangle Geometry
      let adj = x - this.x;
      let opp = y - this.y;
      let hyp = Math.sqrt(opp * opp + adj * adj);

      if (adj == 0 && opp == 0)
        return;

      this.distance = hyp;
      this.xTarget = x;
      this.yTarget = y;

      let angleBetween = Phaser.Math.Angle.Between(this.x, this.y, this.xTarget, this.yTarget);

      if (rotate) {
        this.rotation = angleBetween - this.angleOffset;
        if (this.orientation === 'right') this.flipY = this.vector.x < 0;
        if (this.orientation === 'left') this.flipY = this.vector.x >= 0;
      }
      else {
        if (this.orientation === 'right') this.flipX = this.vector.x < 0;
        if (this.orientation === 'left') this.flipX = this.vector.x >= 0;
      }
      this.vector.setAngle(angleBetween);
    };

    this.move = function () {
      if (this.distance > 0) {
        this.prevX = this.x;
        this.prevY = this.y;

        this.x += this.vector.x;
        this.y += this.vector.y;
        this.distance -= this.vector.length();
        if (this.distance <= 0) {
          
          //this.x -= this.distance
          //this.y -= this.distance
          this.distance = 0;
          this.stop();
        }
      }
    }
    this.moveAway = function () {
      this.prevX = this.x;
      this.prevY = this.y;
      this.x -= this.vector.x;
      this.y -= this.vector.y;

      this.distance += this.vector.length();
    }

    this.bounce = function () {
      this.x = this.prevX;
      this.y = this.prevY;
    }
    this.stop = function () {
      this.distance = 0;
      this.xTarget = this.x;
      this.yTarget = this.y;
    }
    this.getDistance = function () {
      return this.distance;
    }
  };

  this.enablePhysics = function (immovable) {
    if (!this.scene || !this.scene.physics) {
      console.log("ERROR - Cannot enable physics on object because Arcade Physics is not configured.");
      return false;
    }
    let ARCADE = Phaser.Physics.Arcade;
    //isStatic = isStatic ? ARCADE.STATIC_BODY : ARCADE.DYNAMIC_BODY;
    this.scene.physics.world.enable(this, ARCADE.DYNAMIC_BODY)
    Object.assign(this, ARCADE.Components.Acceleration);
    Object.assign(this, ARCADE.Components.Angular);
    Object.assign(this, ARCADE.Components.Bounce);
    Object.assign(this, ARCADE.Components.Debug);
    Object.assign(this, ARCADE.Components.Drag);
    Object.assign(this, ARCADE.Components.Enable);
    Object.assign(this, ARCADE.Components.Friction);
    Object.assign(this, ARCADE.Components.Gravity);
    Object.assign(this, ARCADE.Components.Immovable);
    Object.assign(this, ARCADE.Components.Mass);
    Object.assign(this, ARCADE.Components.Pushable);
    Object.assign(this, ARCADE.Components.Size);
    Object.assign(this, ARCADE.Components.Velocity);

    if (immovable === true) {
      this.setImmovable(true);
      this.body.setAllowGravity(false);
    }

    this.isGrounded = () => {
      return this.body.blocked.down || this.body.touching.down;
    }

    this.setBoundsRectangle = (x, y, width, height) => {
      this.setCollideWorldBounds(true);
      this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(x, y, width, height));
    }
  };


}).call(Phaser.GameObjects.GameObject.prototype);

//================= KEY MODS =======================
// You can only call justDown once per key press. It will only return `true` once, until the Key is released and pressed down again.
// This allows you to use it in situations where you want to check if this key is down without using an event, such as in a core game loop.

(function () {
  this.isPressed = function () {
    return this.isDown;
  };
  this.wasPressed = function () {
    return Phaser.Input.Keyboard.JustDown(this);
  };
  this.isReleased = function () {
    return this.isUp;
  };
  this.wasReleased = function () {
    return Phaser.Input.Keyboard.JustUp(this);
  };

  this.enable = function () {
    this.enabled = true;
    return this;
  };

  this.disable = function () {
    this.enabled = false;
    return this;
  };

  this.shiftPressed = function () {
    return this.shiftKey;
  };

  this.onPress = function (method, context) {
    this.on('down', method, context);
  };

}).call(Phaser.Input.Keyboard.Key.prototype);


Phaser.GameObjects.GameObjectFactory.register('key', function (keyId, enableCapture, emitOnRepeat) {
  return this.scene.input.keyboard.addKey(keyId, enableCapture, emitOnRepeat);
});

//================= TEXT MODS =======================

Phaser.GameObjects.Text.prototype.setFontColor = function (color) {
  color = getHexColor("#", color);
  this.setColor(color);
  this.setFill(color);
  return this;
};

Phaser.GameObjects.Text.prototype.setWidth = function (width) {
  this.setWordWrapWidth(width);
  return this;
};

Phaser.GameObjects.Text.prototype.defuzz = function () {
  this.displayOriginX = Math.round(this.displayOriginX);
  this.displayOriginY = Math.round(this.displayOriginY);
  return this;
};

Phaser.GameObjects.GameObjectFactory.remove('text');
Phaser.GameObjects.GameObjectFactory.register('text', function (x, y, text, style, size) {
  var defaultFont = "Courier";
  var defaultSize = 16;
  if (config) {
    defaultFont = config.fontFamily ? config.fontFamily : defaultFont;
    defaultSize = config.fontSize ? config.fontSize : defaultSize;    
  }
  if (typeof style == 'number') {
    var color = getHexColor("#", style);
    style = {
      fill: color,
      color: color,
      stroke: color,
      fontSize: size ? size : defaultSize,
      fontFamily: defaultFont,
    };
  }
  if (style === undefined) {
    style = {
      fontSize: size ? size : defaultSize,
      fontFamily: defaultFont,
    }
  }
  return this.displayList.add(new Phaser.GameObjects.Text(this.scene, x, y, text, style));
});
//============= Line MOd =========================
Phaser.GameObjects.GameObjectFactory.remove('line');
Phaser.GameObjects.GameObjectFactory.register('line', function (x1, y1, x2, y2, strokeColor, strokeAlpha) {
  return this.displayList.add(new Phaser.GameObjects.Line(this.scene, 0, 0, x1, y1, x2, y2, strokeColor, strokeAlpha)).setOrigin(0, 0);
});

//================= TIMER MODS =======================


(function () {
  this.isUp = function () {
    if (this.expired) {
      this.expired = false;
      return true;
    }
    return false;
  }

  this.pause = function () {
    this.paused = true;
    return this;
  };

  this.unpause = function () {
    this.paused = false;
    return this;
  };

  this.toggle = function () {
    if (this.paused) {
      return this.unpause();
    }
    else {
      return this.pause();
    }
  };

  this.restart = function () {
    this.reset(original);
    return this;
  }

}).call(Phaser.Time.TimerEvent.prototype);


Phaser.GameObjects.GameObjectFactory.register('timer', function (ms, count, paused) {
  var loop = true;
  if (count && typeof count == 'number', count > 0) {
    loop = false;
  }
  var config = {
    delay: ms,
    callback: function () { timer.expired = true; },
    callbackScope: this,
    loop: loop,
    repeat: count - 1,
    startAt: 0,
    paused: paused ? true : false
  };

  var timer = this.scene.time.addEvent(config);
  timer.original = config;
  timer.expired = false;
  return timer;
});

//================ Animation mod ==================================
//Mod the create animation function, but call the original create
(function () {
  this.createOriginal = this.create;
  this.create = function (key, imageset, start, end, frameRate) {
    if (typeof key === "object") {
      this.createOriginal(key);
    }
    else {
      if (Array.isArray(start)) {
        this.createOriginal({
          key: key,
          frames: this.generateFrameNumbers(imageset, { frames: start }),
          frameRate: end,
          repeat: -1
        });
      }
      else if (end === undefined) {
        this.createOriginal({
          key: key,
          frames: [{ key: imageset, frame: start }],
        });
      }
      else {
        this.createOriginal({
          key: key,
          frames: this.generateFrameNumbers(imageset, { start: start, end: end }),
          frameRate: frameRate,
          repeat: -1
        });
      }
    }
  };

}).call(Phaser.Animations.AnimationManager.prototype);

Phaser.GameObjects.Sprite.prototype.play = function (key, ignoreIfPlaying, startFrame) {
  this.anims.play(key, ignoreIfPlaying === undefined ? true : ignoreIfPlaying, startFrame);
  return this;
};
// ============ physics world mod ===================

(function () {

  this.setGravity = function (value) {
    this.world.gravity.y = value;
  };

}).call(Phaser.Physics.Arcade.ArcadePhysics.prototype);

//======================HTML DOM ELEMENTS =======================
Phaser.GameObjects.GameObjectFactory.register('gif', function (x, y, string) {

  var img = document.createElement("img");
  img.src = string;
  var gameObject = new Phaser.GameObjects.DOMElement(this.scene, x, y, img);
  this.displayList.add(gameObject);
  gameObject.setHeight = (h) => { gameObject.node.height = h; return gameObject; }
  gameObject.setWidth = (w) => { gameObject.node.width = w; return gameObject; }
  return gameObject;

});

//this.load.html('login', 'assets/loginform.html');
Phaser.GameObjects.GameObjectFactory.register('html', function (x, y, string) {

  var gameObject = new Phaser.GameObjects.DOMElement(this.scene, x, y);

  if (string.includes(' ') || string.includes('<')) {
    this.displayList.add(gameObject.createFromHTML(string));
  }
  else {
    this.displayList.add(gameObject.createFromCache(string));
  }
  return gameObject;
});


function createInputDOM(factory, x, y, type, width, className) {
  var el = document.createElement("input");
  el.type = type;
  el.className = className;
  el.autocomplete = false;
  el.style = `width: ${width}px;`;

  let obj = new Phaser.GameObjects.DOMElement(factory.scene, x, y, el);
  obj.setOrigin(0, 0);
  factory.displayList.add(obj);

  obj.disable = function () {
    obj.node.disabled = true;
    return obj;
  }

  obj.enable = function () {
    obj.node.disabled = false;
    return obj;
  }

  obj.getValue = function () {
    if (obj.node.max != "" && obj.node.value * 1 > obj.node.max * 1) {
      obj.node.value = obj.node.max * 1;
    }
    if (obj.node.min != "" && obj.node.value * 1 < obj.node.min * 1) {
      obj.node.value = obj.node.min * 1;
    }
    return obj.node.value * 1;
  }

  obj.setValue = function (value) {
    obj.node.value = value;
    return obj;
  }

  obj.setMax = function (value) {
    obj.node.max = value;
  }

  obj.setMin = function (value) {
    obj.node.min = value;
  }

  obj.setStep = function (value) {
    obj.node.step = value;
  }

  obj.setRange = function (min, max, step) {
    if (step === undefined) step = 1;
    obj.setMin(min);
    obj.setMax(max);
    obj.setStep(step);
  }

  return obj;
}

Phaser.GameObjects.GameObjectFactory.register('textInput', function (x, y, width, className) {
  let obj = createInputDOM(this, x, y, "text", width, className);

  //Text-based input types
  obj.getValue = () => {
    if (obj.node === null) return null;
    if (obj.node.type == "color") {
      return "0x" + obj.node.value.trim().substr(1);
    }
    else if (typeof obj.node.value == "string") {
      return obj.node.value.trim();
    }
    return obj.node.value;
  }

  obj.setValue = (value) => {
    obj.node.value = value;
    setTimeout(function () { obj.node.selectionStart = obj.node.selectionEnd = 10000; }, 0);
    return obj;
  }

  return obj;
});

Phaser.GameObjects.GameObjectFactory.register('numberInput', function (x, y, width, className) {
  let obj = createInputDOM(this, x, y, "number", width, className);

  return obj;
});

Phaser.GameObjects.GameObjectFactory.register('sliderInput', function (x, y, width, className) {
  let obj = createInputDOM(this, x, y, "range", width, className);

  return obj;
});






