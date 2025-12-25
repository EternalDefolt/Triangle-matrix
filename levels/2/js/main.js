const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const timerElement = document.getElementById('timer-val');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
let player;
let hud;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let pickups = [];
let gameLoopId;
let isGameOver = false;

// Survival Logic
let startTime = Date.now();
const survivalTime = 3 * 60; // 3 minutes in seconds
let timeLeft = survivalTime;

// Spawning Logic
let currentWave = 0;
let spawnTimer = 0;

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: color || '#FFF'
        });
    }
}

function init() {
    hud = new HUD();
    player = new Player(canvas.width / 2, canvas.height / 2, (x, y, angle) => {
        bullets.push({
            x: x, y: y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            life: 100
        });
        Sound.playerShoot();
    });

    // Initial Spawn
    spawnWave();

    loop();
}

function spawnWave() {
    currentWave++;
    hud.setMessage(`ВОЛНА ${currentWave}`);
    Sound.waveStart();
    setTimeout(() => hud.setMessage(""), 2000);

    // Harder every wave
    const count = 3 + currentWave; // 4, 5, 6...

    for (let i = 0; i < count; i++) {
        // Random Enemy Type
        const r = Math.random();
        let e;
        const ex = Math.random() * canvas.width;
        const ey = Math.random() * canvas.height;

        if (r < 0.5) {
            e = new CircleEnemy(ex, ey);
        } else if (r < 0.8) {
            e = new TriangleEnemy(ex, ey, (x, y, vx, vy) => {
                enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, life: 200 });
            });
        } else {
            // Rare Square
            e = new SquareEnemy(ex, ey, (x, y, vx, vy) => {
                enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, life: 300 });
            });
        }
        enemies.push(e);
    }
}

function loop() {
    if (isGameOver) return;

    // Time Logic
    const elapsed = (Date.now() - startTime) / 1000;
    timeLeft = survivalTime - elapsed;

    if (timeLeft <= 0) {
        timeLeft = 0;
        timerElement.innerText = "0:00";
        isGameOver = true;
        Sound.victory();
        document.getElementById('victory-overlay').style.display = 'flex';
        return;
    }

    // Format Timer
    const m = Math.floor(timeLeft / 60);
    const s = Math.floor(timeLeft % 60);
    timerElement.innerText = `${m}:${s < 10 ? '0' + s : s}`;

    // Wave Spawning
    if (enemies.length < 3 + currentWave) {
        spawnTimer++;
        if (spawnTimer > 300) { // Every 5 seconds approx check/spawn
            spawnWave();
            spawnTimer = 0;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update(canvas.width, canvas.height);
    hud.update(player);

    if (player.hp <= 0) {
        isGameOver = true;
        Sound.defeat();
        document.getElementById('death-overlay').style.display = 'flex';
        return;
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.update(player);
        e.draw(ctx);
    }

    // Bullets (Player)
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();

        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < e.radius + 4) { // approximate radius for all
                e.takeDamage();
                spawnParticles(e.x, e.y, 5, '#FFF');
                bullets.splice(i, 1);
                if (e.hp <= 0) {
                    // spawn HP pickup with 50% chance
                    if (Math.random() < 0.5) pickups.push({ x: e.x, y: e.y, vx: 0, vy: 1.5, life: 600, amt: 10, label: 'xp', alpha: 1 });
                    enemies.splice(j, 1);
                    spawnParticles(e.x, e.y, 20, '#F00');
                    Sound.enemyDeath();
                }
                break;
            }
        }
        if (b.life <= 0) bullets.splice(i, 1);
    }

    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.fillStyle = '#F00';
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();

        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let hit = false;
        if (player.isShielding && player.shieldCooldown <= 0) {
            if (dist < player.size * 1.5 + 5) {
                player.hitShield();
                spawnParticles(b.x, b.y, 5, '#AAA');
                Sound.shieldBlock();
                hit = true;
            }
        }

        if (!hit && dist < player.size + 5) {
            player.takeDamage(5);
            spawnParticles(player.x, player.y, 10, '#F00');
            Sound.playerHit();
            hit = true;
        }

        if (hit || b.life <= 0) enemyBullets.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
        let pu = pickups[i];
        pu.x += pu.vx; pu.y += pu.vy; pu.life--;
        pu.vy -= 0.02;
        ctx.save(); ctx.globalAlpha = Math.max(0, pu.life / 600); ctx.fillStyle = '#FFFFFF'; ctx.font = '18px Arial'; ctx.fillText(pu.label, pu.x - 8, pu.y); ctx.restore();
        const dxp = player.x - pu.x; const dyp = player.y - pu.y; const distp = Math.sqrt(dxp*dxp + dyp*dyp);
        if (distp < player.size + 12) {
            player.hp = Math.min(player.maxHP, player.hp + pu.amt);
            spawnParticles(player.x, player.y, 8, '#8F8');
            pickups.splice(i, 1);
        }
        if (pu.life <= 0) pickups.splice(i, 1);
    }

    player.draw(ctx);
    gameLoopId = requestAnimationFrame(loop);
}

// Exit
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        location.href = '../../ui_menu/html/index.html';
    }
});

init();
