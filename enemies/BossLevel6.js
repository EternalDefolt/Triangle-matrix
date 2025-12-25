class BossLevel6 {
    constructor(x, y, onShoot) {
        this.type = 'boss6';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.maxHP = 200; // two halves of 100 each
        this.hp = this.maxHP;
        this.size = 80;
        this.radius = 110;
        this.onShoot = onShoot;
        this.angle = 0;

        // Timers
        this.shootTimer = 0;
        this.minionTimer = 0;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;

        // For phase-2 percent triggers
        this.prevPhaseHP = null; // will be set on first update
    }

    getPhase() {
        return this.hp > this.maxHP / 2 ? 1 : 2;
    }

    getColor() {
        // ensure bullets and UI remain visible on dark background
        return this.getPhase() === 1 ? '#FFFFFF' : '#FF4444';
    }

    // expose to UI
    getHP() { return this.hp; }
    getMaxHP() { return this.maxHP; }

    update(player, spawnMinion) {
        const phase = this.getPhase();

        if (this.prevPhaseHP === null) this.prevPhaseHP = phase === 1 ? this.hp : this.hp - this.maxHP/2;

        // Rotation / visual spin
        const rotSpeed = phase === 1 ? 0.06 : 0.04;
        this.angle += rotSpeed;

        // Movement towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));

        let moveSpeed = phase === 1 ? 0.12 : 0.07; // faster in phase 1

        // Dash logic (kept but rarer)
        if (phase === 2 && this.dashCooldown <= 0 && !this.isDashing && Math.random() < 0.004) {
            this.isDashing = true;
            this.dashTimer = 50;
            this.dashCooldown = 260;
        }

        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.isDashing) {
            this.dashTimer--;
            if (this.dashTimer > 20) {
                this.x += (Math.random() - 0.5) * 6;
                this.y += (Math.random() - 0.5) * 6;
            } else if (this.dashTimer > 0) {
                this.vx = (dx / dist) * 10;
                this.vy = (dy / dist) * 10;
            } else {
                this.isDashing = false;
            }
        } else {
            if (dist > 120) {
                this.vx += (dx / dist) * moveSpeed;
                this.vy += (dy / dist) * moveSpeed;
            }
        }

        this.vx *= 0.95;
        this.vy *= 0.95;
        this.x += this.vx;
        this.y += this.vy;

        // Shooting behavior -- similar to level-3 boss but faster in phase1
        this.shootTimer--;
        const shootInterval = phase === 1 ? 100 : 120;
        if (this.shootTimer <= 0) {
            this.shootTimer = shootInterval;
            if (this.onShoot) {
                const bulletCount = phase === 1 ? 12 : 16;
                const bulletSpeed = phase === 1 ? 3.5 : 3.5;
                for (let i = 0; i < bulletCount; i++) {
                    const a = (Math.PI * 2 / bulletCount) * i + this.angle;
                    this.onShoot(this.x, this.y, Math.cos(a) * bulletSpeed, Math.sin(a) * bulletSpeed);
                }
            }
        }

        // Phase 2: percentage-based spawns and radial attacks
        if (phase === 2) {
            const phaseHP = this.hp; // remaining hp in phase (0..100)
            const prev = this.prevPhaseHP;

            // Spawn 5 circle enemies each time we drop past another 10% of the phase HP
            const prevPercent10 = Math.floor((prev / (this.maxHP/2)) * 100 / 10);
            const currPercent10 = Math.floor((phaseHP / (this.maxHP/2)) * 100 / 10);
            if (currPercent10 < prevPercent10) {
                // spawn for each threshold crossed
                for (let t = prevPercent10 - 1; t >= currPercent10; t--) {
                    for (let k = 0; k < 5; k++) {
                        const rx = this.x + (Math.random() - 0.5) * 180;
                        const ry = this.y + (Math.random() - 0.5) * 180;
                        spawnMinion(rx, ry);
                    }
                }
            }

            // Radial attack every 15% (of the phase)
            const prevPercent15 = Math.floor((prev / (this.maxHP/2)) * 100 / 15);
            const currPercent15 = Math.floor((phaseHP / (this.maxHP/2)) * 100 / 15);
            if (currPercent15 < prevPercent15) {
                // trigger radial attack (send explicit visible color)
                if (this.onShoot) {
                    const bulletCount = 24;
                    const bulletSpeed = 4.2;
                    const color = '#FF4444';
                    for (let i = 0; i < bulletCount; i++) {
                        const a = (Math.PI * 2 / bulletCount) * i + Math.random() * 0.5;
                        this.onShoot(this.x, this.y, Math.cos(a) * bulletSpeed, Math.sin(a) * bulletSpeed, color);
                    }
                }
            }

            this.prevPhaseHP = phaseHP;
        } else {
            // keep prevPhaseHP tracking for when we enter phase 2
            this.prevPhaseHP = this.hp - this.maxHP/2;
        }

        // Collision with player
        const pdx = player.x - this.x;
        const pdy = player.y - this.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < this.radius + player.size) {
            if (player.isShielding && player.shieldCooldown <= 0) {
                player.hitShield();
                this.vx = -(pdx / pdist) * 5;
                this.vy = -(pdy / pdist) * 5;
            } else {
                player.takeDamage(12);
            }
        }
    }

    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const phase = this.getPhase();

        if (phase === 1) {
            // Phase 1: concentric circles (outer ring, middle ring, filled core)
            const s = this.size;
            // outer circle
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.stroke();

            // middle circle (ring)
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // inner filled circle
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
            ctx.fill();

            // small decorative dots around outer circle
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 8; i++) {
                const a = i * (Math.PI * 2 / 8) + this.angle * 0.5;
                const rx = Math.cos(a) * (s + 12);
                const ry = Math.sin(a) * (s + 12);
                ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            // Phase 2: hexagon with inner 6-point star (drawn as alternating radii star)
            const r = this.size * 1.1;
            ctx.strokeStyle = '#FFFFFF';
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.lineWidth = 5;

            // hexagon
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
                pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath();
            ctx.stroke();

            // 6-point star via alternating radii (12 points) - hollow (stroke only)
            const innerR = r * 0.48;
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const a = (Math.PI * 2 / 12) * i - Math.PI / 2;
                const rad = (i % 2 === 0) ? r * 0.78 : innerR;
                const x = Math.cos(a) * rad;
                const y = Math.sin(a) * rad;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            // draw only outline so star is hollow
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();

            // optional inner spoke lines to enhance hollow-star look
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
                const outerX = Math.cos(a) * (r * 0.78);
                const outerY = Math.sin(a) * (r * 0.78);
                ctx.moveTo(0,0);
                ctx.lineTo(outerX, outerY);
            }
            ctx.stroke();
        }

        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = BossLevel6;
