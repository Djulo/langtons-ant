class Drawer{

    constructor(size, levels){
        this.colors = this.generateRandomColors(levels);
        this.antcolor = 'white'
        this.levels = levels
        this.size = size
    }

    redraw(grid, antX, antY, dir){
        clear()
        this.drawGrid(grid, antX, antY, dir)
    }

    generateRandomColors(count) {
        var colors = [color("#17141d")];

        for (var i = 0; i < count; i++) {
            var uniqueColor = getUniqueColor(generateRandomColor());

            colors.push(uniqueColor);
        }

        function generateRandomColor() {
            var letters = '0123456789ABCDEF'.split('');
            var color = '#';

            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }

        function getUniqueColor(hexColor) {
            for (var i = 0, len = colors.length; i < len; i++) {
                if (colors[i] == hexColor) getUniqueColor(generateRandomColor());
            }
            return hexColor;
        }

        return colors;
    }

    drawGrid(grid, antX, antY, dir){
        this.setShapeDrawingMode()
        for(let x = 0; x < grid.length; x++){
            for(let y = 0; y < grid[0].length; y++){
                this.drawShape(x, y, grid[x][y])
            }
        }
        this.drawAnt(antX, antY, dir)
    }

    drawShape(x, y, level){
        let color = this.colors[level];
        fill(color)
        this.setShapeDrawingMode()
        rect(x * this.size, y * this.size, this.size, this.size)
    }

    drawPrevShape(x, y, level){
        this.setShapeDrawingMode()
        this.drawShape(x, y, level)
    }

    drawCurrShape(x, y, dir, level){
        this.setShapeDrawingMode()
        this.drawShape(x, y, level)
        this.drawAnt(x, y, dir)
    }

    setShapeDrawingMode(){
        strokeWeight(0.01 * this.size)
        stroke(100)
    }

    drawAnt(x, y, dir){
        strokeWeight(0)
        fill(this.antcolor)

        translate((x + 0.5) * this.size, (y + 0.5) * this.size)
        rotate((dir * 0.5 + 0.5) * PI)

        let x1 = 0
        let y1 = -0.3 * this.size
        let x2 = this.size/4
        let y2 = this.size/3
        let x3 = -this.size/4
        let y3 = this.size/3

        triangle(x1, y1, x2, y2, x3, y3);
        resetMatrix();
    }
}

class Walker {

    constructor(pattern){
        this.pattern = pattern
        this.levels = pattern.length
    }

    moveAnt(grid, x, y, dir, action){
        let newDir = dir, newX = x, newY = y
        if(action == 'L'){ // Left
            newDir = (dir + 3) % 4
        } else if(action == 'R'){ // Right
            newDir = (dir + 1) % 4
        } else if(action == 'B'){ // Back
            newDir = (dir + 2) % 4
        } else if(action == 'F'){ // Forward
            newDir = dir
        }

        grid[x][y] = (grid[x][y] + 1) % this.levels

        switch(newDir){
            case 0:
                newX = x + 1
                break;
            case 1:
                newY = y + 1
                break;
            case 2:
                newX = x - 1
                break;
            case 3:
                newY = y - 1
                break;
        }

        return [newX, newY, newDir]
    }
}
