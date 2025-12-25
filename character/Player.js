class Player {
    constructor(x, y, onShoot) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.acceleration = 0.6;
        this.friction = 0.88;
        this.maxSpeed = 6;
        this.size = 20;
        this.angle = 0;
        this.onShoot = onShoot;

        // Input state
        this.keys = { w: false, a: false, s: false, d: false };
        this.isMouseDown = false;

        // Shooting
        this.shootCooldown = 0;
        this.shootCooldownMax = 12;

        // Stats
        this.hp = 50;
        this.maxHP = 50;
        this.isShielding = false;
        this.shieldMaxHP = 5;
        this.shieldHP = this.shieldMaxHP;
        this.shieldCooldown = 0;
        this.shieldCooldownMax = 300;

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
            if (e.button === 0) this.isMouseDown = true;
            else if (e.button === 2) this.isShielding = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
            else if (e.button === 2) this.isShielding = false;
        });
        window.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('blur', () => {
            this.keys = { w: false, a: false, s: false, d: false };
            this.isMouseDown = false;
            this.isShielding = false;
        });
    }

    update(canvasWidth, canvasHeight) {
        // Shield cooldown
        if (this.shieldCooldown > 0) {
            this.shieldCooldown--;
            if (this.shieldCooldown <= 0) this.shieldHP = this.shieldMaxHP;
        }

        // Shooting cooldown
        if (this.shootCooldown > 0) this.shootCooldown--;

        // Auto-shoot when LMB held
        if (this.isMouseDown && this.shootCooldown <= 0) {
            if (this.onShoot) this.onShoot(this.x, this.y, this.angle);
            this.shootCooldown = this.shootCooldownMax;
        }

        // WASD controls movement
        if (this.keys.w) this.vy -= this.acceleration;
        if (this.keys.s) this.vy += this.acceleration;
        if (this.keys.a) this.vx -= this.acceleration;
        if (this.keys.d) this.vx += this.acceleration;

        // Friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Clamp speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Screen boundaries
        const margin = this.size;
        if (this.x < margin) this.x = margin;
        if (this.x > canvasWidth - margin) this.x = canvasWidth - margin;
        if (this.y < margin) this.y = margin;
        if (this.y > canvasHeight - margin) this.y = canvasHeight - margin;
    }

    hitShield() {
        if (!this.isShielding || this.shieldCooldown > 0) return false;
        this.shieldHP--;
        if (this.shieldHP <= 0) {
            this.shieldCooldown = this.shieldCooldownMax;
            this.isShielding = false;
        }
        return true;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw triangular player
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

        // Draw circular shield (360 degrees)
        if (this.isShielding && this.shieldCooldown <= 0) {
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.globalAlpha = this.shieldHP / this.shieldMaxHP;
            ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }
}
