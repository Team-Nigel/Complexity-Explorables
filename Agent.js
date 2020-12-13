

export class Agent() {
    const base_speed = 1.0,
        speed_floor = 0.7,
        speed_ceiling = 1.3;
    constructor(id,L,speed) {
        this.id = id;
        this.x = Math.random() * L;
        this.y = Math.random() * L;
        this.theta = Math.random() * 360;
        this.speed = speed;
        this.selected = false;
    }

    resetPosition(L) {
        this.x = Math.random() * L;
        this.y = Math.random() * L;
        this.theta = Math.random() * 360;
    }
}

export function agent (N,L) {
    return d3.range(N).map(function (d, i) { return new Agent(i, L, speed) }
}
