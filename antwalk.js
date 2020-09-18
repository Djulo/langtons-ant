class Antwalk {
    speed = 1;
    actionsPerDraw = 1;
    counter = 0;
    initDraw = false
    paused = true
    counterElement;
    enlargeCounter = 0
    drawer;
    walker;

    constructor(grid, width, height, pattern){
        this.pattern = pattern.split('')

        this.grid = []
        this.gridX = grid
        this.gridY = this.gridX
        this.size = width / this.gridX
        this.drawer = new Drawer(this.size, this.pattern.length)
        this.walker = new Walker(this.pattern)

        for(let x = 0; x < this.gridX; x++){
            let column = []
            for(let y = 0; y < this.gridY; y++){
                column.push(0)
            }
            this.grid.push(column)
        }

        this.x = Math.round(this.gridX/2)
        this.y = Math.round(this.gridY/2)
        this.prevX = this.x
        this.prevY = this.y
        this.dir = 0
        this.needsEnlargement = false

        if(this.counterElement == null){
            this.counterElement = document.getElementById("counter")
        }

        this.drawer.drawGrid(this.grid, this.x, this.y, this.dir)
    }

    draw(){
        if(this.needsRedraw){
            this.drawer.redraw(this.grid, this.x, this.y, this.dir)
            displayEnlargmentInfo(false)
            this.needsRedraw = false
        }
        if(!this.paused){
            for(let i = 0; i < this.actionsPerDraw; i++){
                this.move()
            }
        }
    }

    move(){
        this.moveAnt()
        if(!this.needsRedraw){
            this.drawer.drawPrevShape(this.prevX, this.prevY, this.grid[this.prevX][this.prevY])
            this.drawer.drawCurrShape(this.x, this.y, this.dir, this.grid[this.x][this.y])
        }
        this.counter += 1
        this.counterElement.textContent = "Counter: " + this.counter
    }

    moveAnt(){
        let action = this.pattern[this.grid[this.x][this.y]]
        let result = this.walker.moveAnt(this.grid, this.x, this.y, this.dir, action)

        this.prevX = this.x
        this.prevY = this.y
        this.x = result[0]
        this.y = result[1]
        this.dir = result[2]

        if(!this.isInBounds(this.x, this.y)){
            if(this.enlargeCounter < 5){
                console.log("Enlarge on counter " + this.counter + " with x=" + this.x + ",y=" + this.y)
                this.needsRedraw = true
                displayEnlargmentInfo(true)
                this.enlargeGrid()
            } else {
                this.paused = true
                displayEnlargementWarning(true)
            }
        }
    }

    enlargeGrid(){
        this.enlargeCounter++
        let newGridX = this.gridX * 2
        let newGridY = this.gridY * 2

        let newGrid = []
        for(let x = 0; x < newGridX; x++){
            let column = []
            for(let y = 0; y < newGridY; y++){
                column.push(0)
            }
            newGrid.push(column)
        }

        let offsetX = Math.round(newGridX / 4)
        let offsetY = offsetX
        if(this.type == "hex"){
            offsetY *= 2
        }

        for(let x = 0; x < this.gridX; x++){
            for(let y = 0; y < this.gridY; y++){
                newGrid[x + offsetX][y + offsetY] = this.grid[x][y]
            }
        }

        this.gridX = newGridX
        this.gridY = newGridY
        this.size = 0.5 * this.size
        this.drawer.size = this.size
        this.grid = newGrid

        this.x += offsetX
        this.y += offsetY
    }

    isInBounds(x, y){
        return (x >= 0 && x < this.gridX && y >= 0 && y < this.gridY)
    }

}