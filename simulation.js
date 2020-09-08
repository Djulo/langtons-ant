let SIMULATION = {
  rules: {},
  nextRuleID: 0,
  ants: {},
  nextAntID: 0,
  width: 100,
  height: 100,
  squareSize: 4,
  wrap: false,
  paused: true,
  iteration: 0,
  grid: undefined,
  dirs: {
    u: { dx: 0, dy: -1 },
    r: { dx: 1, dy: 0 },
    d: { dx: 0, dy: 1 },
    l: { dx: -1, dy: 0 },
  },

  /**
   * Initializes the grid, canvas, and pixels, the calls simulate
   * @return this, so it can be chained
   */
  start() {
    this.iteration = 0;

    // initialize grid
    this.grid = new Array(this.width);
    for (let i = 0; i < this.width; ++i) {
      this.grid[i] = new Array(this.height);
      for (let j = 0; j < this.height; ++j) {
        this.grid[i][j] = Object.keys(this.rules)[0]; // first rule
      }
    }

    this.paused = false;
    this.simulate();

    return this;
  },

  /**
   * Runs one step of the simulation, applying the rules to each ant. It moves
   * each ant before changing and color squares to make sure the order of the
   * ants doesn't matter. If there are still ants alive and the simulation is
   * not paused it calls itself again.
   * @return the number of ants still alive
   */
  simulate() {
    // iterate over ants
    let t;
    for (let a in this.ants) {
      if (typeof this.ants[a] !== "undefined") {
        t = this.ants[a];

        // remember the previous location so we can update the square it
        // left after all ants have moved
        t.i = t.x;
        t.j = t.y;

        let squareColor = this.grid[t.x][t.y];

        // turn to follow the rule at this location
        if (this.rules[squareColor].d === "r") {
          // turn right by adding 1
          let temp = ("urdl".indexOf(t.d) + 1) % 4;
          t.d = "urdl"[("urdl".indexOf(t.d) + 1) % 4];
        } else if (this.rules[squareColor].d === "l") {
          // turn left by subtracting 1
          t.d = "urdl"[("urdl".indexOf(t.d) + 3) % 4];
        } else if (this.rules[squareColor].d === "u") {
          // make a U-turn by adding 2
          t.d = "urdl"[("urdl".indexOf(t.d) + 2) % 4];
        }
        // otherwise this.rules[squareColor].d id 'c', continue
        // straight, so we don't need to change the direction

        // move forward
        t.x += this.dirs[t.d].dx;
        t.y += this.dirs[t.d].dy;

        // if wrap is on,wrap ant position
        if (this.wrap) {
          if (t.x < 0) t.x = this.width - 1;
          // left bound
          else if (t.x >= this.width) t.x = 0; // right bound
          if (t.y < 0) t.y = this.height - 1;
          // top bound
          else if (t.y >= this.height) t.y = 0; //bottom bound
        }

        // sanity check
        t.s = !(t.x < 0 || t.x >= this.width || t.y < 0 || t.y >= this.height);
      }
    }

    let antCount = 0;
    t = undefined;

    // now that all ants have moved, iterate through them again, update the
    // colors of the squares they left, and remove any that are out of
    // bounds. This prevents an issue where multiple ants collide, causing
    // all ants after the first to follow a different rule than the one they
    // would have otherwise.
    for (let a in this.ants) {
      if (typeof this.ants[a] !== "undefined") {
        t = this.ants[a];
        let oldCol = this.grid[t.i][t.j];

        // strip out undefined rules
        let validRules = Object.keys(this.rules).filter(
          (el) => typeof el !== "undefined"
        );

        let oldNum = validRules.indexOf(oldCol); // index in validRules
        let newNum = (oldNum + 1) % validRules.length;
        let newCol = validRules[newNum];

        // update old position
        this.grid[t.i][t.j] = newCol;

        // color old position
        UI.drawSquare(t.i, t.j);

        // count sane ants and kill insane ones
        if (t.s) {
          antCount++;
        } else {
          // show in the UI that ant is dead
          //   $("#ant-" + a)
          //     .find("h3")
          //     .html("Ant " + a + " (Dead)");
          delete this.ants[a];
        }
      }
    }

    this.iteration++;
    UI.updateIteration();

    // stop if there are no more ants remaining
    if (antCount < 1) {
      UI.paused = true;
      //$('#pause').fadeOut(200);
    } else if (!this.paused) {
      // 1ms interval gives canvas time to draw
      setTimeout(() => this.simulate(), 1000);
    }

    return antCount;
  },

  /**
   * Sets paused to false, reloads UI's pixels and calls simulate again
   * @return this so it can be chained
   */
  resume() {
    this.paused = false;
    this.simulate();
  },
};

let UI = {
  ctx: undefined,
  started: false,

  /**
   * Updates Simulation.rules to reflect a new direction for a particular rule.
   * Should be called when the direction radio buttons are clicked. Also
   * updates the URL.
   * @param number the ID number of the rule being changed, required.
   * @param dir the new direction. Must be of the form /^[lrcu]$/, required.
   * @return this, so it can be chained, or undefined if it failed
   */
  dirChange(number, dir) {
    //this.pause();

    // validate input
    if (typeof number !== "number" || number >= rules.length || number < 0) {
      throw "dirChange: illegal ID number: " + number;
    }
    if (!dir || !/^[lrcu]$/i.test(dir)) {
      throw "dirChange: illegal direction: " + dir;
    }

    SIMULATION.rules[number].d = dir;
    return this;
  },

  /**
   * Adds a randomized rule, both to the UI and to the rule list. Updates the
   * URL afterward, and the pixels.
   * @param color: the color for this rule in the form #123abc. Generates a
   * random color if omitted or illegal
   * @param rule: one of ['l', 'r', 'c', 'u']. Generates a random rule if
   * omitted or illegal
   * @return this, so it can be chained.
   */
  addRule(color, rule) {
    let id = SIMULATION.nextRuleID++,
      newRule;

    // if color isn't a valid HTML color generate a new one
    let col = /^#[0-9A-F]{6}$/i.test(color) ? color : this.randColor();

    // if rule isn't a valid rule generate a new one
    if ("lrcu".indexOf(rule) > -1 && rule.length === 1) {
      newRule = rule;
    } else {
      let z = Math.random();
      if (z < 0.25) newRule = "l";
      else if (z < 0.5) newRule = "r";
      else if (z < 0.75) newRule = "c";
      else newRule = "u";
    }

    // create HTML element showing this rule and append it to div#rules
    let node = document.createElement("div");
    node.classList.add("a-rule");
    node.id = id;
    node.innerHTML = `<div class="swatch-wrapper" id="swatch-wrapper-${id}" 
				 title="Select color" style="background-color: ${col}">
			<input class="swatch" id="swatch-${id}" value="${col}" type="color">
			</div>
			<div class="rule-radio-wrapper">
			<input type="radio" name="rule-${id}" id="rule-${id}-l" value="l"
					${newRule === "l" ? "checked" : ""}>
			<label for="rule-${id}-l" title="Turn left">L</label>
			<input type="radio" name="rule-${id}" id="rule-${id}-r" value="r"
					${newRule === "r" ? "checked" : ""}>
			<label for="rule-${id}-r" title="Turn right">R</label>
			<input type="radio" name="rule-${id}" id="rule-${id}-c" value="c"
					${newRule === "c" ? "checked" : ""}>
			<label for="rule-${id}-c" title="Continue straight">C</label>
			<input type="radio" name="rule-${id}" id="rule-${id}-u" value="u"
					${newRule === "u" ? "checked" : ""}>
			<label for="rule-${id}-u" title="Make a U-turn">U</label>
			<i class="fas fa-times" title="Delete rule" id="delete-rule-${id}"></i>
			</div>`;
    document.getElementById("rules").appendChild(node);

    // hide the X button
    if (SIMULATION.started)
      document.querySelector("#rule-box i.fa-times").style.visibility =
        "hidden";

    // animate
    // document.querySelector("#rule-" + id).forEach((box) => {
    //   box.style.display = "none";
    // });
    // $("#rule-" + id).slideDown();

    // add swatchChange listener to the swatch input
    document.querySelector("#swatch-" + id).addEventListener("change", () => {
      SIMULATION.swatchChange(
        id,
        document.querySelector("#swatch-" + id).val()
      );
    });

    // add dirChange listener to the radio buttons
    document
      .querySelector("input[type=radio][name=rule-" + id + "]")
      .addEventListener("change", () => {
        SIMULATION.dirChange(id, this.value);
      });

    // add deleteRule listener to the X button
    document
      .querySelector("#delete-rule-" + id)
      .addEventListener("click", () => {
        SIMULATION.deleteRule(id);
      });

    // add the new rule to simulation.rules
    SIMULATION.rules[id] = { c: col, d: newRule };

    UI.initializePixels();

    return this;
  },

  /**
   * Adds a randomized ant, both to the UI and to the ant list. Updates the
   * URL afterward.
   * @param startX the starting x position of this ant, in squares from the
   * left wall. Random if omitted or invalid.
   * @param startY the starting y position of this ant, in squares from the
   * top wall. Random if omitted or invalid.
   * @param startDir the starting direction of this ant, in the form
   * /^[udlr]{1}$/. Random if omitted or invalid.
   * @return this, so it can be chained.
   */
  addAnt(startX, startY, startDir) {
    let id = SIMULATION.nextAntID++;

    // validate input
    if (isNaN(startX) || startX < 1 || startX > SIMULATION.width) {
      var startX = Math.random() * SIMULATION.width;
    }
    if (isNaN(startY) || startY < 1 || startY > SIMULATION.height) {
      var startY = Math.random() * SIMULATION.height;
    }

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (!/^[udlr]{1}$/i.test(startDir)) {
      let z = Math.random();
      if (z < 0.25) startDir = "u";
      else if (z < 0.5) startDir = "d";
      else if (z < 0.75) startDir = "l";
      else startDir = "r";
    }

    // add to BOARD.ants
    SIMULATION.ants[id] = { x: startX, y: startY, d: startDir };

    // add to DOM
    let node = document.createElement("div");
    node.id = `ant-${id}`;
    node.classList.add("an-ant", "box");
    node.innerHTML = `<i class="fas fa-times" title="Delete ant" 
						id="delete-ant-${id}">
				</i>
				<h3>Ant ${id}</h3>
				<label for="ant-${id}-x">Initial x position</label>
				<input type="number" id="ant-${id}-x" class='x-input' 
						value="${startX}">
				<br>
				<label for="ant-${id}-y">Initial y position</label>
				<input type="number" id="ant-${id}-y" class='y-input'
						value="${startY}">
				<br>
				<label for="ant-${id}-dir">Initial direction</label>
				<select id="ant-${id}-dir" class='d-input'>
					<option value="u" ${startDir === "u" ? "selected" : ""}>
						Up
					</option>
					<option value="d" ${startDir === "d" ? "selected" : ""}>
						Down
					</option>
					<option value="l" ${startDir === "l" ? "selected" : ""}>
						Left
					</option>
					<option value="r" ${startDir === "r" ? "selected" : ""}>
						Right
					</option>
				</select>`;
    document.querySelector("#ants-inner")
      .appendChild(node);

    // animate
    // document.querySelector("#rule-" + id).forEach((box) => {
    //   box.style.display = "none";
    // });
    // $("#ant-" + id).slideDown();

    // add update listeners to inputs
    document
      .querySelector(`#ant-${id}-x, #ant-${id}-y, #ant-${id}-dir`)
      .addEventListener("change", () => {
        this.updateAnt(id);
      });

    // add deleteAnt listener to X button
    document
      .querySelector("#delete-ant-" + id)
      .addEventListener("click", () => this.deleteAnt(id));

    return this;
  },

  /**
   * Updates a given ant in simulation.ants based on the info in the DOM inputs.
   * Also updates URL.
   * @param id the ID of the ant to change, required.
   * @return this, so it can be chained
   */
  updateAnt(id) {
    // create this ant if it doesn't already exist
    if (!SIMULATION.ants[id])
      SIMULATION.ants[id] = { x: undefined, y: undefined, d: undefined };
    SIMULATION.ants[id].x = parseInt($(`#ant-${id}-x`).val());
    SIMULATION.ants[id].y = parseInt($(`#ant-${id}-y`).val());
    SIMULATION.ants[id].d = $(`#ant-${id}-dir`).val();

    return this;
  },

  /**
   * Deletes the ant with the given ID from simulation.ants, and removes its
   * display from the DOM. Note that this doesn't change the HTML ID's of
   * existing HTML elements. Also updates URL.
   * @param id the ID of the rule to delete
   * @return this, so it can be chained
   */
  deleteAnt(id) {
    // remove from simulation
    delete SIMULATION.ants[id];

    // remove deleted DOM elements
    let el = document.querySelector("#ant-" + id);
    el.parentNode.removeChild(el);
    //$('#ant-' + id).slideUp(400, () => $('#ant-' + id).remove());

    return this;
  },

  /**
   * Deletes the rule with the given ID from simulation.rules, and removes its
   * display from the DOM. Note that this doesn't change the HTML ID's of
   * existing HTML elements. Also updates URL and pixels.
   * @param id the ID of the rule to delete
   * @return this, so it can be chained
   */
  deleteRule(id) {
    // validate input
    if (!SIMULATION.rules[id]) {
      throw "deleteRule: illegal ID: " + id;
    }

    // make sure the user isn't deleting the last rule
    if (Object.keys(SIMULATION.rules).length <= 1) {
      return;
    }

    delete SIMULATION.rules[id];

    // remove deleted DOM elements
    let el = document.querySelector("#rule-" + id);
    el.parentNode.removeChild(el);
    //$('#rule-' + id).slideUp(400, () => $('#rule-' + id).remove());

    // update url and pixels
    this.initializePixels();

    return this;
  },

  /**
   * Generates a random HTML color
   * @return a color string in the form #123abc.
   */
  randColor() {
    let color = "#";
    for (let i = 0; i < 6; ++i) {
      color += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
    }
    return color;
  },

  /**
   * Encodes the ant starting positions visible in the UI in base64.
   * Each ant is represented as a 24-bit binary string. The first 11 bits are
   * an unsigned integer representing the initial X position of the ant
   * (giving a maximum of 2047). Likewise, the next 11 bits are the initial Y
   * position of the ant. The final two bits represent which direction the ant
   * is facing: 00 for up, 01 for down, 10 for left, and 11 for right.
   * @return the base64-encoded string representing the ants in the UI
   */
  encodeAnts() {
    // get ant info from UI
    let uiAnts = [];
    document.querySelectorAll(".an-ant").forEach((i, el) => {
      uiAnts.push({
        x: $(el).find(".x-input").val(),
        y: $(el).find(".y-input").val(),
        d: $(el).find(".d-input").val(),
      });
    });

    // convert ant objects to binary string.
    let bin = "";
    for (let i = 0; i < uiAnts.length; ++i) {
      // x coord as 11-bit unsigned int
      bin += (+uiAnts[i].x).toString(2).padStart(11, "0");
      // y coord as 11-bit unsigned int
      bin += (+uiAnts[i].y).toString(2).padStart(11, "0");
      // 2-bit direction
      bin += "udlr".indexOf(uiAnts[i].d).toString(2).padStart(2, "0");
    }

    // convert binary string to base64
    let out = "";
    for (let i = 0; i < bin.length; i += 6) {
      out += this.encodeOne(bin.substring(i, i + 6));
    }

    return out;
  },

  /**
   * Encodes the rules array in base64.
   * Each rule consists of a six-hex-digit color (24 bits) and one of four
   * possible directions (2 bits). Each color in order is converted from six
   * hex digits to a 24-digit binary string, then encoded as four base64
   * characters. At the end of the string, two-bit directions are packed into
   * six-bit chunks and converted to base64 characters (three directions per
   * character. If the number of rules is not divisible by 3 the end is padded
   * with 0 bits. The final string is the encoded colors, followed by a `|'
   * character, followed by the encoded directions
   * @return the encoded base64 string
   */
  encodeRules() {
    let dirBits = "";
    let tempDirChars = "";
    let out = "";
    let dirs, binString;

    for (const r in SIMULATION.rules) {
      if (typeof SIMULATION.rules[r] !== "undefined") {
        binString = "";
        // convert color to binary string
        for (let i = 1; i < 7; i += 2) {
          // start at 1 to remove '#'
          binString += parseInt(SIMULATION.rules[r].c.substring(i, i + 2), 16)
            .toString(2)
            .padStart(8, "0");
        }

        // convert binary string to base64 string
        for (let i = 0; i < binString.length; i += 6) {
          out += this.encodeOne(binString.substring(i, i + 6));
        }

        // convert directions to binary
        dirBits += "lrcu"
          .indexOf(SIMULATION.rules[r].d)
          .toString(2)
          .padStart(2, "0");
      }
    }

    out += "-";

    // pad out direction bits and convert to base64
    while (dirBits.length % 6 != 0) dirBits += "0";
    for (let i = 0; i < dirBits.length; i += 6) {
      out += this.encodeOne(dirBits.substring(i, i + 6));
    }

    return out;
  },

  /**
   * Converts a binary string to a base64 string
   * @param binary a binary string, required
   * @return the input string encoded in base64, or undefined if invalid input
   */
  binToB64(binary) {
    // validate input
    if (!/^[01]+$/i.test(binary)) {
      console.error("binToB64: invalid binary string: " + binary);
      return;
    }

    let out = "";
    for (let i = 0; i < binary.length; i += 6) {
      out += this.encodeOne(parseInt(bitString.substring(i, i + 6), 2));
    }
    return out;
  },

  /**
   * Converts one six-bit binary string to one base64 character
   * @param num a six-bit binary string, required
   * @return a single base64 character, or undefined if invalid input
   */
  encodeOne(num) {
    num = parseInt(num, 2);
    const s =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    return s[num];
  },

  /**
   * Converts one base64 character to one six-bit binary string
   * @param char a base64 character, required
   * @return a single six-bit binary string, or undefined if invalid input
   */
  decodeOne(char) {
    const s =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    if (char.length !== 1 || s.indexOf(char) < 0)
      throw "illegal character: " + char;
    else return s.indexOf(char).toString(2).padStart(6, "0");
  },

  /**
   * Checks the query string and tries to decode a set of ants from it. If it
   * can't, it generates one ant in the center of the board.
   * @return this, so it can be chained
   */
  decodeAnts() {
    const urlParams = new URLSearchParams(window.location.search);
    let b64Ants = urlParams.get("a");
    if (b64Ants) {
      // urlParams.get() replaces '+' with ' ', so we replace it back
      b64Ants = b64Ants.replace(/ /g, "+");
      try {
        // convert b64Ants to binary
        let binString = "";
        for (let i = 0; i < b64Ants.length; ++i) {
          binString += this.decodeOne(b64Ants[i]);
        }

        // decode binary string, 24 bits at a time
        for (let i = 0; i < binString.length; i += 24) {
          // first 11 bits: X coord
          let newX = parseInt(binString.substring(i, i + 11), 2);
          // second 11 bits: Y coord
          let newY = parseInt(binString.substring(i + 11, i + 22), 2);
          // last 2 bits: direction
          let newD = "udlr"[parseInt(binString.substring(i + 22, i + 24), 2)];

          // add to UI
          this.addAnt(newX, newY, newD);
        }
      } catch (err) {
        console.error("something went wrong: " + err);
        console.log("Failed to read ants from query string");
      }
    } else {
      // no ant query string, generate a basic ant instead
      this.addAnt(SIMULATION.width / 2, SIMULATION.height / 2, "u");
    }

    return this;
  },

  /**
   * Checks the query string and tries to decode a set of rules from it. If it
   * can't, it generates two rules randomly.
   * @return this, so it can be chained.
   */
  decodeRules() {
    const urlParams = new URLSearchParams(window.location.search);
    let b64Rules = urlParams.get("r");
    if (b64Rules) {
      // urlParams.get() replaces '+' with ' ', so we replace it back
      b64Rules = b64Rules.replace(/ /g, "+");
      try {
        let binString = "";
        let colors = [];
        let dirs;
        let tempCol = "#";
        if (b64Rules.includes("|")) b64Rules = b64Rules.split("|");
        else b64Rules = b64Rules.split("-");
        const c = b64Rules[0];
        const d = b64Rules[1];
        // convert colors to binary string
        for (let i = 0; i < c.length; ++i) {
          binString += this.decodeOne(c[i]);
        }

        // convert binary string back to #123abc style colors
        for (let i = 0; i < binString.length; i += 8) {
          tempCol += parseInt(binString.substring(i, i + 8), 2)
            .toString(16)
            .padStart(2, "0");
          if (tempCol.length >= 7) {
            colors.push(tempCol);
            tempCol = "#";
          }
        }

        // convert directions to binary string
        binString = "";
        for (let i = 0; i < d.length; ++i) {
          binString += this.decodeOne(d[i]);
        }

        // convert binary string to a 'l', 'r', 'c', or 'u'
        dirs = new Array(colors.length);
        // remember that directions are 2 bits
        for (let i = 0; i < colors.length * 2; i += 2) {
          dirs[Math.floor(i / 2)] = "lrcu"[
            parseInt(binString.substring(i, i + 2), 2)
          ];
        }

        // add the decoded rules
        for (let i = 0; i < colors.length; ++i) {
          this.addRule(colors[i], dirs[i]);
        }
      } catch (err) {
        // something went wrong, let's just make two random rules
        console.error("something went wrong: " + err);
        this.addRule().addRule();
      }
    } else {
      // no query string, make two starting rules
      this.addRule("#ffffff", "r").addRule("#000000", "l");
    }

    this.initializePixels();

    return this;
  },

  /**
   * Decodes the height, width, square size, and wrap settings from the query
   * string. If it can't decode any of these, it sets the defaults as follows:
   * width: 100
   * height: 100
   * squareSize: 4
   * wrap: false
   * Also sets the values of the UI inputs.
   * @return this, so it can be chained
   */
  decodeMain() {
    const urlParams = new URLSearchParams(window.location.search);
    let tempH, tempW, tempS;
    let tempM = urlParams.get("m");
    let tempWrap = urlParams.get("p") === ""; // param exists

    if (tempM) {
      try {
        // urlParams.get() replaces '+' with ' ', so we replace it back
        tempM = tempM.replace(/ /g, "+");
        // convert to decimal
        tempH = parseInt(
          this.decodeOne(tempM[0]) + this.decodeOne(tempM[1]),
          2
        );
        tempW = parseInt(
          this.decodeOne(tempM[2]) + this.decodeOne(tempM[3]),
          2
        );
        tempS = parseInt(
          this.decodeOne(tempM[4]) + this.decodeOne(tempM[5]),
          2
        );
      } catch (err) {
        console.log("Failed to read main inputs from query string");
        tempH = 100;
        tempW = 100;
        tempS = 4;
        tempWrap = false;
      }
    } else {
      // no query string
      tempH = 100;
      tempW = 100;
      tempS = 4;
      tempWrap = false;
    }

    // set values and fire the .change() listener, which changes the
    // simulation values
    let el = document.querySelector("#height");
    el.value = tempH;
    el.dispatchEvent(new Event("change"));

    el = document.querySelector("#width");
    el.value = tempW;
    el.dispatchEvent(new Event("change"));

    el = document.querySelector("#square-size");
    el.value = tempS;
    el.dispatchEvent(new Event("change"));

    el = document.querySelector("#wrap");
    el.checked = tempWrap;
    el.dispatchEvent(new Event("change"));

    this.initializeCanvas();
    return this;
  },

  /**
   * Removes start button and replaces it with pause and reset, removes rule X
   * buttons, disables Ant starting inputs, then calls simulation.start()
   * @return this, so it can be chained
   */
  start() {
    this.started = true;

    // $('#resume').fadeOut(200);
    // $('#start').fadeOut(200, () => {
    // 	$('#pause').fadeIn(200);
    // });

    // set rule X's to visibility: hidden so they're invisible but still
    // take up space
    document.querySelector("#rule-box i.fa-times").style.visibility = "hidden";

    // can't change ant initial positions and starting directions, height,
    // width, or square size after it starts
    document.querySelector(".an-ant input, .an-ant select").disabled =
      "disabled";
    document.querySelector("#height, #width, #square-size").disabled =
      "disabled";

    SIMULATION.start();
    return this;
  },

  /**
   * Helper function that converts a hex color, e.g. #123abc to RGB, e.g.
   * rgb(124, 48, 202)
   * @param hex the hex color, in the form #123abc, required
   * @return a string representing the RGB equivalent
   */
  hexToRGB(hex) {
    // validate input
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      throw "hexToRGB: Illegal hex color: " + hex;
    }

    // uses `+()' as type coercion to convert hex to decimal
    return (
      "rgb(" +
      +("0x" + hex[1] + hex[2]) +
      ", " +
      +("0x" + hex[3] + hex[4]) +
      ", " +
      +("0x" + hex[5] + hex[6]) +
      ")"
    );
  },

  /**
   * Removes an existing canvas, if there is one, and creates a new one based
   * on simulation's dimensions.
   * This should be called only when the dimensions or square size changes,
   * because that requires a new canvas
   * @return this, so it can be chained
   */
  initializeCanvas() {
    // remove existing canvas
    let el = document.querySelector("#canvas");
    if (el) el.parentNode.removeChild(el);

    // insert new one
    let parent = document.querySelector("#canvas-holder");
    let child = document.createElement("canvas");
    child.id = "canvas";
    child.classList.add("gridCanvas");
    child.width = SIMULATION.width * SIMULATION.squareSize;
    child.height = SIMULATION.height * SIMULATION.squareSize;
    parent.insertBefore(child, parent.firstChild);

    this.initializePixels();

    return this;
  },

  /**
   * Resets UI's pixels object and recreates each entry based on simulation's
   * rules. Fills the canvas with the first color if it hasn't been already.
   * This should only need to be called when the colors are changed.
   * @return this, so it can be chained
   */
  initializePixels() {
    // make sure the canvas already exists. Create it if not
    let canv = document.getElementById("canvas");
    if (!canv) {
      this.initializeCanvas();
      return;
    }
    this.ctx = canv.getContext("2d");

    // fill canvas with first color
    let fc = Object.keys(SIMULATION.rules)[0]; // first valid color
    if (!this.started && SIMULATION.rules[fc]) {
      this.ctx.fillStyle = this.hexToRGB(SIMULATION.rules[fc].c);
      this.ctx.fillRect(0, 0, canv.width, canv.height);
    }

    // Draw grid lines
    let s = SIMULATION.squareSize;
    console.log(SIMULATION.squareSize);
    let nX = Math.floor(canv.width / s);
    let nY = Math.floor(canv.height / s);
    let pX = canv.width - nX * s;
    let pY = canv.height - nY * s;

    // Bonus code for choosing nX instead of s
    /* let nX = 20
      let s = Math.floor(this.width / (nX + 2))
      let pX = this.width - nX * s
      let nY = Math.floor((this.height - pX) / (this.width - pX) * nX)
      let pY = this.height - nY * s */

    let pL = Math.ceil(pX / 2) - 0.5;
    let pT = Math.ceil(pY / 2) - 0.5;
    let pR = canv.width - nX * s - pL;
    let pB = canv.height - nY * s - pT;

    this.ctx.strokeStyle = "lightgrey";
    this.ctx.beginPath();
    for (var x = pL; x <= canv.width - pR; x += s) {
      this.ctx.moveTo(x, pT);
      this.ctx.lineTo(x, canv.height - pB);
    }
    for (var y = pT; y <= canv.height - pB; y += s) {
      this.ctx.moveTo(pL, y);
      this.ctx.lineTo(canv.width - pR, y);
    }
    this.ctx.stroke();

    return this;
  },

  /**
   * Displays the current iteration on the DOM
   * @return this, so it can be chained
   */
  updateIteration() {
    if (SIMULATION.iteration > 0) {
      document.querySelector("#iteration").innerHTML = "Iteration " + SIMULATION.iteration;
    } else {
      document.querySelector("#iteration").innerHTML = "";
    }
  },

  /**
   * Colors in the square at x, y with the correct color based on the data in
   * simulation.grid
   * @param x x coordinate, required
   * @param y y coordinate, required
   * @return this, so it can be chained
   */
  drawSquare(x, y) {
    this.ctx.fillStyle = SIMULATION.rules[SIMULATION.grid[x][y]].c;
    this.ctx.fillRect(
      x * SIMULATION.squareSize,
      y * SIMULATION.squareSize,
      SIMULATION.squareSize,
      SIMULATION.squareSize
    );
    return this;
  },

  /**
   * Sets simulation.paused to true and changes the 'Pause' button to the 'Resume'
   * button
   * @return this, so it can be chained
   */
  pause() {
    if (!SIMULATION.paused) {
      SIMULATION.paused = true;
      //$('#pause').fadeOut(200, () => { $('#resume').fadeIn(200) });
    }
  },

  /**
   * Hides 'Resume' button, shows 'Pause button, and calls simulation.resume()
   * @return this, so it can be chained
   */
  resume() {
    //$('#resume').fadeOut(200, () => { $('#pause').fadeIn(200) });
    SIMULATION.resume();
  },

  /**
   * Clears the canvas and grid, sets iteration to 0, re-enables inputs that
   * were disabled by UI.start(), and resets ants to their starting positions
   * @return this, so it can be chained
   */
  reset() {
    SIMULATION.paused = true;
    // 2 ms timeout allows pending step to finish if still running
    setTimeout(function () {
      this.started = false;

      // remove canvas
      let el = document.getElementById("canvas");
      el.parentNode.removeChild(el);

      // make new canvas
      this.initializeCanvas();

      // reset ants to starting positions
      document.querySelectorAll(".an-ant").forEach((i, el) => {
        const id = document.querySelector(el).id.substring(4);
        this.updateAnt(id);
        // remove `(Dead)' from UI
        document.querySelector(el).querySelector("h3").innerHtml = "Ant " + id;
      });

      // reset iteration count
      SIMULATION.iteration = 0;
      this.updateIteration();

      // make rule X's visible again
      document.querySelector("#rule-box i.fa-times").visibility = "visible";

      // re-enable main inputs and ant inputs
      document.querySelector(".an-ant input, .an-ant select").disabled = false;
      document.querySelector("#height, #width, #square-size").disabled = false;

      // show correct buttons
      // if (document.getElementById('pause').offsetParent == null) {

      // }

      // if ($('#pause').is(':visible')) {
      // 	$('#pause').fadeOut(200, () => {
      // 		$('#start').fadeIn(200)
      // 	});
      // } else {
      // 	$('#resume').fadeOut(200, () => {
      // 		$('#start').fadeIn(200)
      // 	});
      // }
    }, 2);

    return this;
  },
};

let ready = (callback) => {
  if (document.readyState != "loading") callback();
  else document.addEventListener("DOMContentLoaded", callback);
};

ready(() => {
  //buttons
  document.getElementById("add-rule").addEventListener("click", () => {
    UI.addRule();
  });
  document.getElementById("add-ant").addEventListener("click", () => {
    UI.addAnt();
  });

  document.getElementById("pause").addEventListener("click", () => {
    UI.pause();
  });
  document.getElementById("resume").addEventListener("pause", () => {
    UI.resume();
  });
  document.getElementById("reset").addEventListener("reset", () => {
    UI.reset();
  });

  //main input listeners
  document.getElementById("width").addEventListener("change", () => {
    let newWidth = Math.floor(document.getElementById("width").value);

    //enforce upper and lower bounds
    if (newWidth < 1) newWidth = 1;
    if (newWidth > 2047) newWidth = 2047;
    document.getElementById("width").value = newWidth;
    SIMULATION.width = document.getElementById("width").value;
    UI.initializeCanvas();
  });
  document.getElementById("height").addEventListener("change", () => {
    let newHeight = Math.floor(document.getElementById("height").value);

    //enforce upper and lower bounds
    if (newHeight < 1) newHeight = 1;
    if (newHeight > 2047) newHeight = 2047;
    document.getElementById("height").value = newHeight;
    SIMULATION.height = document.getElementById("height").value;
    UI.initializeCanvas();
  });
  document.getElementById("square-size").addEventListener("change", () => {
    let newSquareSize = Math.floor(
      document.getElementById("square-size").value
    );

    //enforce upper and lower bounds
    if (newSquareSize < 1) newSquareSize = 1;
    if (newSquareSize > 2047) newSquareSize = 2047;
    document.getElementById("square-size").value = newSquareSize;
    SIMULATION.squareSize = document.getElementById("square-size").value;
    UI.initializeCanvas();
  });
  document.getElementById("wrap").addEventListener("change", () => {
    SIMULATION.wrap = document.getElementById("wrap").checked;
  });

  //parse rules, ants, and main inputs from query string
  UI.decodeMain().decodeRules().decodeAnts();

  //enable start
  document.getElementById("start").addEventListener("click", () => {
    UI.start();
  });
});
