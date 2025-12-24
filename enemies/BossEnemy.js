class BossEnemy {
    constructor(x, y, onShoot) {
        this.type = 'boss';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = 100;
        this.maxHP = 100;
        this.size = 75; // 3x bigger than normal square
        this.radius = 100;
        this.onShoot = onShoot;
        this.angle = 0;

        // Phase timers
        this.shootTimer = 0;
        this.minionTimer = 0;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;
    }

    getPhase() {
        if (this.hp > 60) return 1;
        if (this.hp > 30) return 2;
        return 3;
    }

    getColor() {
        const phase = this.getPhase();
        if (phase === 1) return '#FFFFFF';
        if (phase === 2) return '#FFFF00';
        return '#FF4444';
    }

    update(player, spawnMinion) {
        const phase = this.getPhase();

        // Rotation speed based on phase
        const rotSpeed = phase === 3 ? 0.06 : (phase === 2 ? 0.04 : 0.02);
        this.angle += rotSpeed;

        // Movement
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Movement speed based on phase
        let moveSpeed = phase === 3 ? 0.15 : (phase === 2 ? 0.08 : 0.04);

        // Dash logic (Phase 3 only)
        if (phase === 3 && this.dashCooldown <= 0 && !this.isDashing && Math.random() < 0.005) {
            this.isDashing = true;
            this.dashTimer = 60;
            this.dashCooldown = 300;
        }

        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.isDashing) {
            this.dashTimer--;
            if (this.dashTimer > 30) {
                // Charging up - vibrate
                this.x += (Math.random() - 0.5) * 5;
                this.y += (Math.random() - 0.5) * 5;
            } else if (this.dashTimer > 0) {
                // Dashing towards player
                this.vx = (dx / dist) * 12;
                this.vy = (dy / dist) * 12;
            } else {
                this.isDashing = false;
            }
        } else {
            // Normal movement
            if (dist > 100) {
                this.vx += (dx / dist) * moveSpeed;
                this.vy += (dy / dist) * moveSpeed;
            }
        }

        this.vx *= 0.95;
        this.vy *= 0.95;
        this.x += this.vx;
        this.y += this.vy;

        // Shooting
        this.shootTimer--;
        if (this.shootTimer <= 0) {
            const shootInterval = phase === 3 ? 90 : (phase === 2 ? 120 : 180);
            this.shootTimer = shootInterval;

            if (this.onShoot) {
                const bulletCount = phase === 3 ? 16 : 8;
                const bulletSpeed = phase === 3 ? 4 : 3;
                for (let i = 0; i < bulletCount; i++) {
                    const a = (Math.PI * 2 / bulletCount) * i + this.angle;
                    this.onShoot(this.x, this.y, Math.cos(a) * bulletSpeed, Math.sin(a) * bulletSpeed);
                }
            }
        }

        // Minion spawning (Phase 2+)
        if (phase >= 2 && spawnMinion) {
            this.minionTimer--;
            if (this.minionTimer <= 0) {
                this.minionTimer = 600; // Every 10 seconds
                spawnMinion(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100);
            }
        }

        // Collision with player
        if (dist < this.radius + player.size) {
            if (player.isShielding && player.shieldCooldown <= 0) {
                player.hitShield();
                this.vx = -(dx / dist) * 5;
                this.vy = -(dy / dist) * 5;
            } else {
                player.takeDamage(10);
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

        const color = this.getColor();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#000';

        // Outer Square
        const s = this.size;
        ctx.beginPath();
        ctx.rect(-s, -s, s * 2, s * 2);
        ctx.fill();
        ctx.stroke();

        // Inner pattern - X
        ctx.beginPath();
        ctx.moveTo(-s + 15, -s + 15);
        ctx.lineTo(s - 15, s - 15);
        ctx.moveTo(s - 15, -s + 15);
        ctx.lineTo(-s + 15, s - 15);
        ctx.stroke();

        // Inner border
        ctx.beginPath();
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.stroke();

        // Core circle
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}
