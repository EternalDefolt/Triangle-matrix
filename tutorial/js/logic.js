const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const hintText = document.getElementById('hint-text');

let player;
let gameLoopId;
let tutorialStep = 0; // 0: Look, 1: Move, 2: Fight, 3: Done
let rotationTotal = 0;
let distanceTotal = 0;
let lastRotation = 0;

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let enemiesSpawned = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color || '#FFF';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Enemy {
    constructor(type) {
        this.type = type; // 'circle', 'triangle'
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        if (Math.abs(this.x - canvas.width / 2) < 200) this.x += 300;
        if (Math.abs(this.y - canvas.height / 2) < 200) this.y += 300;

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.95;

        this.hp = type === 'circle' ? 2 : 3;
        this.radius = 20;

        // Behaviors
        this.stunTimer = 0;
        this.shootTimer = Math.random() * 100;

        // Triangle specific: Target destination
        this.targetX = this.x;
        this.targetY = this.y;
        this.pickNewTarget();
    }

    pickNewTarget() {
        // Random point on screen
        this.targetX = Math.random() * canvas.width;
        this.targetY = Math.random() * canvas.height;
    }

    update(player) {
        // Physics Apply
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Stun Logic
        if (this.stunTimer > 0) {
            this.stunTimer--;
            // Even if stunned, inertia works (they bounce back)
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);

        if (this.type === 'circle') {
            // Accelerate towards player (Ram)
            const accel = 0.2;
            if (dist > 0) {
                this.vx += (dx / dist) * accel;
                this.vy += (dy / dist) * accel;
            }
        } else if (this.type === 'triangle') {
            // Move to random target points (smoothly)
            const tdx = this.targetX - this.x;
            const tdy = this.targetY - this.y;
            const tDist = Math.sqrt(tdx * tdx + tdy * tdy);

            const accel = 0.1; // Slower acceleration
            if (tDist > 10) {
                this.vx += (tdx / tDist) * accel;
                this.vy += (tdy / tDist) * accel;
            } else {
                this.pickNewTarget();
            }

            // Shoot
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.shootTimer = 120 + Math.random() * 60;
                // Fire at player
                enemyBullets.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angleToPlayer) * 3,
                    vy: Math.sin(angleToPlayer) * 3,
                    life: 300
                });
            }
        }

        // Shield Collision
        if (player.isShielding && player.shieldCooldown <= 0) {
            const shieldRadius = player.size * 1.5;
            if (dist < this.radius + shieldRadius) {
                const pdx = this.x - player.x;
                const pdy = this.y - player.y;
                const pAngle = Math.atan2(pdy, pdx);

                let angleDiff = Math.abs(pAngle - player.angle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < Math.PI / 3) {
                    // Hit Shield
                    if (player.hitShield()) {
                        // bounce Impulse
                        const force = 10;
                        this.vx = Math.cos(pAngle) * force;
                        this.vy = Math.sin(pAngle) * force;

                        spawnParticles(this.x, this.y, 5, '#AAA');

                        if (this.type === 'circle') {
                            this.stunTimer = 60;
                        }
                    }
                }
            }
        }
    }

    takeDamage() {
        this.hp--;
        spawnParticles(this.x, this.y, 10, '#FFF');

        if (this.type === 'triangle') {
            // Dodge / Relocate on hit
            this.pickNewTarget();
            // Add a little impulse away from where they were hit?
            // Or just a burst of speed
            const angle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(angle) * 5;
            this.vy += Math.sin(angle) * 5;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = '#FFF';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 2;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.stunTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        }

        ctx.beginPath();
        if (this.type === 'circle') {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else {
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(-this.radius, this.radius);
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function startTutorial() {
    player = new Player(canvas.width / 2, canvas.height / 2, (x, y, angle) => {
        bullets.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            life: 200
        });
    });
    lastRotation = player.angle;
    updateHint();
    loop();
}

function updateHint() {
    if (tutorialStep === 0) hintText.innerText = "Покрутите мышкой";
    else if (tutorialStep === 1) hintText.innerText = "Используйте WASD для перемещения";
    else if (tutorialStep === 2) hintText.innerText = "Враги: Круг (таран, отбрасывается щитом), Треугольник (стреляет и уворачивается).";
    else if (tutorialStep === 3) hintText.innerText = "Обучение закончено!";
}

function spawnEnemies() {
    for (let i = 0; i < 3; i++) enemies.push(new Enemy('triangle'));
    for (let i = 0; i < 2; i++) enemies.push(new Enemy('circle'));
    enemiesSpawned = true;
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update();
    player.draw(ctx);

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    ctx.fillStyle = '#FFFFFF';
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < e.radius + 4) {
                e.takeDamage();
                bullets.splice(i, 1);
                if (e.hp <= 0) {
                    enemies.splice(j, 1);
                    spawnParticles(e.x, e.y, 30, '#F00');
                }
                break;
            }
        }
        if (b.life <= 0) bullets.splice(i, 1);
    }

    ctx.fillStyle = '#FF4444';
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();

        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < player.size + 5) {
            spawnParticles(b.x, b.y, 5, '#F00');
            enemyBullets.splice(i, 1);
            continue;
        }

        if (player.isShielding && player.shieldCooldown <= 0) {
            if (dist < player.size * 1.5 + 5) {
                const angleToBullet = Math.atan2(b.y - player.y, b.x - player.x);
                let angleDiff = Math.abs(angleToBullet - player.angle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

                if (angleDiff < Math.PI / 3) {
                    player.hitShield();
                    spawnParticles(b.x, b.y, 5, '#AAA');
                    enemyBullets.splice(i, 1);
                }
            }
        }

        if (b.life <= 0) enemyBullets.splice(i, 1);
    }

    if (tutorialStep >= 2 && enemiesSpawned) {
        enemies.forEach(e => {
            e.update(player);
            e.draw(ctx);
        });

        if (enemies.length === 0) {
            tutorialStep = 3;
            updateHint();
        }
    }

    if (tutorialStep === 0) {
        let diff = Math.abs(player.angle - lastRotation);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        rotationTotal += diff;
        lastRotation = player.angle;
        if (rotationTotal > 3) {
            tutorialStep = 1;
            updateHint();
        }
    } else if (tutorialStep === 1) {
        if (player.isMoving) {
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            distanceTotal += speed;
        }
        if (distanceTotal > 300) {
            tutorialStep = 2;
            updateHint();
            spawnEnemies();
        }
    }

    gameLoopId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") window.location.href = "../../html/index.html";
});

startTutorial();
