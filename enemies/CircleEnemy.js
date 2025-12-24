class CircleEnemy {
    constructor(x, y) {
        this.type = 'circle';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 2;
        this.radius = 15;
        this.stunTimer = 0;
        this.dashTimer = 0;
        this.dashCooldown = 0;
    }

    update(player) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;

        if (this.stunTimer > 0) {
            this.stunTimer--;
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.dashCooldown <= 0 && dist < 200 && Math.random() < 0.02) {
            this.dashTimer = 30;
            this.dashCooldown = 120;
            this.vx *= 0.1;
            this.vy *= 0.1;
        }

        if (this.dashTimer > 0) {
            this.dashTimer--;
            if (this.dashTimer === 0) {
                const dashSpeed = 15;
                const ax = dx / dist;
                const ay = dy / dist;
                this.vx = ax * dashSpeed;
                this.vy = ay * dashSpeed;
            }
        } else {
            if (dist > 0) {
                const accel = 0.3;
                this.vx += (dx / dist) * accel;
                this.vy += (dy / dist) * accel;
            }
        }

        if (player.isShielding && player.shieldCooldown <= 0) {
            const shieldRadius = player.size * 1.5;
            if (dist < this.radius + shieldRadius) {
                const pAngle = Math.atan2(this.y - player.y, this.x - player.x);
                let angleDiff = Math.abs(pAngle - player.angle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < Math.PI / 3) {
                    if (player.hitShield()) {
                        this.vx = Math.cos(pAngle) * 12;
                        this.vy = Math.sin(pAngle) * 12;
                        this.stunTimer = 60;
                    }
                }
            }
        }

        if (dist < this.radius + player.size && this.stunTimer === 0) {
            player.takeDamage(2);
            this.vx = -(dx / dist) * 8;
            this.vy = -(dy / dist) * 8;
            this.stunTimer = 20;
        }
    }

    takeDamage() {
        this.hp--;
        this.vx *= -1.5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.dashTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Pattern: Concentric circles
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}
