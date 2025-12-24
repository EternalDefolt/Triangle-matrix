class TriangleEnemy {
    constructor(x, y, onShoot) {
        this.type = 'triangle';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 3;
        this.maxHP = 3;
        this.radius = 20;
        this.onShoot = onShoot;

        this.state = 'aggro';
        this.targetX = x;
        this.targetY = y;
        this.shootTimer = 60 + Math.random() * 60;
        this.moveTimer = 0;
        this.rotation = 0;
    }

    update(player) {
        this.rotation += 0.05;

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);

        const desiredDist = 250;

        this.moveTimer--;
        if (this.moveTimer <= 0) {
            this.moveTimer = 30 + Math.random() * 30;
            let ax = dx / dist;
            let ay = dy / dist;
            let moveX = 0;
            let moveY = 0;

            if (dist > desiredDist + 50) {
                moveX += ax;
                moveY += ay;
            } else if (dist < desiredDist - 50) {
                moveX -= ax;
                moveY -= ay;
            }

            const strafeDir = Math.random() > 0.5 ? 1 : -1;
            moveX += -ay * strafeDir * 2;
            moveY += ax * strafeDir * 2;

            const force = 2.0;
            this.vx += moveX * force;
            this.vy += moveY * force;
        }

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shootTimer = 100 + Math.random() * 50;
            if (this.onShoot) {
                const spread = (Math.random() - 0.5) * 0.2;
                this.onShoot(this.x, this.y, Math.cos(angleToPlayer + spread) * 4, Math.sin(angleToPlayer + spread) * 4);
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
                        this.vx = Math.cos(pAngle) * 15;
                        this.vy = Math.sin(pAngle) * 15;
                    }
                }
            }
        }
    }

    takeDamage() {
        this.hp--;
        const angle = Math.random() * Math.PI * 2;
        this.vx += Math.cos(angle) * 10;
        this.vy += Math.sin(angle) * 10;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Triangle
        const r = this.radius;
        // Main Shape
        ctx.beginPath();
        ctx.moveTo(r * Math.cos(this.rotation), r * Math.sin(this.rotation));
        ctx.lineTo(r * Math.cos(this.rotation + 2.09), r * Math.sin(this.rotation + 2.09));
        ctx.lineTo(r * Math.cos(this.rotation + 4.18), r * Math.sin(this.rotation + 4.18));
        ctx.closePath();

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Pattern: Inner Triangle (Static rotation relative to outer or Reverse?)
        // Let's reverse rotate inner
        const innerR = r * 0.5;
        ctx.beginPath();
        const rot = -this.rotation;
        ctx.moveTo(innerR * Math.cos(rot), innerR * Math.sin(rot));
        ctx.lineTo(innerR * Math.cos(rot + 2.09), innerR * Math.sin(rot + 2.09));
        ctx.lineTo(innerR * Math.cos(rot + 4.18), innerR * Math.sin(rot + 4.18));
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }
}
