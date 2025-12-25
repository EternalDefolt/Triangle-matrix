class SquareEnemy {
    constructor(x, y, onShoot) {
        this.type = 'square';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 8;
        this.size = 25;
        this.radius = 35; // Added for collision detection (size * sqrt(2) approx)
        this.onShoot = onShoot;
        this.shootTimer = 100;
        this.angle = 0;
    }

    update(player) {
        this.angle += 0.02;

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.9;
        this.vy *= 0.9;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 150) {
            this.vx += (dx / dist) * 0.05;
            this.vy += (dy / dist) * 0.05;
        }

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 180;
            if (this.onShoot) {
                for (let i = 0; i < 8; i++) {
                    const a = (Math.PI * 2 / 8) * i + this.angle;
                    this.onShoot(this.x, this.y, Math.cos(a) * 3, Math.sin(a) * 3);
                }
            }
        }
    }

    takeDamage() {
        this.hp--;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#000';

        // Outer Square
        ctx.beginPath();
        const s = this.size;
        ctx.rect(-s, -s, s * 2, s * 2);
        ctx.fill();
        ctx.stroke();

        // Pattern: Inner X/Cross
        ctx.beginPath();
        ctx.moveTo(-s + 5, -s + 5);
        ctx.lineTo(s - 5, s - 5);
        ctx.moveTo(s - 5, -s + 5);
        ctx.lineTo(-s + 5, s - 5);
        ctx.stroke();

        // Pattern: Inner Border
        ctx.beginPath();
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.stroke();

        ctx.restore();
    }
}
