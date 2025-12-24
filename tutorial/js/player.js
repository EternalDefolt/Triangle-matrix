class Player {
    constructor(x, y, onShoot) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.acceleration = 0.5;
        this.friction = 0.9;
        this.maxSpeed = 5;

        this.size = 20;
        this.angle = 0;

        this.keys = { w: false, a: false, s: false, d: false };
        this.isMoving = false;

        this.isShielding = false;
        this.shieldMaxHP = 5;
        this.shieldHP = this.shieldMaxHP;
        this.shieldCooldown = 0;
        this.shieldCooldownMax = 300; // 5 seconds at 60fps

        this.onShoot = onShoot;

        this.initInput();
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.w = true; break;
                case 'KeyA': this.keys.a = true; break;
                case 'KeyS': this.keys.s = true; break;
                case 'KeyD': this.keys.d = true; break;
            }
        });
        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.w = false; break;
                case 'KeyA': this.keys.a = false; break;
                case 'KeyS': this.keys.s = false; break;
                case 'KeyD': this.keys.d = false; break;
            }
        });
        window.addEventListener('mousemove', (e) => {
            const dx = e.clientX - this.x;
            const dy = e.clientY - this.y;
            this.angle = Math.atan2(dy, dx);
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // LMB
                if (this.onShoot) this.onShoot(this.x, this.y, this.angle);
            } else if (e.button === 2) { // RMB
                this.isShielding = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // RMB
                this.isShielding = false;
            }
        });

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    update() {
        // Cooldown Logic
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
            if (this.shieldCooldown <= 0) {
                this.shieldHP = this.shieldMaxHP; // Restore shield
            }
        }

        // Acceleration
        if (this.keys.w) this.vy -= this.acceleration;
        if (this.keys.s) this.vy += this.acceleration;
        if (this.keys.a) this.vx -= this.acceleration;
        if (this.keys.d) this.vx += this.acceleration;

        // Friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Speed Limit
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.isMoving = speed > 0.1;
    }

    // Call this when an enemy hits the shield
    hitShield() {
        if (!this.isShielding || this.shieldCooldown > 0) return false;

        this.shieldHP--;
        if (this.shieldHP <= 0) {
            this.shieldCooldown = this.shieldCooldownMax;
            this.isShielding = false;
        }
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw Player
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size, -this.size * 0.8);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size, this.size * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Shield
        if (this.isShielding && this.shieldCooldown <= 0) {
            ctx.beginPath();
            ctx.lineWidth = 3;
            // Opacity based on HP
            ctx.globalAlpha = this.shieldHP / this.shieldMaxHP;
            ctx.arc(0, 0, this.size * 1.5, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (this.shieldCooldown > 0) {
            // Optional: visual indicator of cooldown?
            // Maybe a faint red ring or just nothing (since it's "broken")
        }

        ctx.restore();
    }
}
