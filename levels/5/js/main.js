const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const waveIndicator = document.getElementById('wave-indicator');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// State
let player;
let hud;
let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let pickups = [];
let isGameOver = false;
let currentWave = 0;

// Waves definition (3 waves)
const waves = [
    { count: 6, types: ['circle', 'triangle'] },
    { count: 9, types: ['circle', 'triangle', 'triangle'] },
    { count: 12, types: ['square', 'triangle', 'circle'] }
];

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

function pickRandomType(types) {
    return types[Math.floor(Math.random() * types.length)];
}

function createShieldedEnemy(type) {
    const x = Math.random() * (canvas.width - 200) + 100;
    const y = Math.random() * (canvas.height - 200) + 100;
    let e;
    if (type === 'circle') e = new CircleEnemy(x, y);
    else if (type === 'triangle') e = new TriangleEnemy(x, y, (ex, ey, vx, vy) => {
        enemyBullets.push({ x: ex, y: ey, vx: vx, vy: vy, life: 200 });
    });
    else if (type === 'square') e = new SquareEnemy(x, y, (ex, ey, vx, vy) => {
        enemyBullets.push({ x: ex, y: ey, vx: vx, vy: vy, life: 300 });
    });

    // Add shield properties
    e.hasShield = true;
    e.shieldHP = 1; // single ram to remove
    e.shieldColor = '#FFFFFF';
    // Make square enemies static in this level
    if (type === 'square') {
        e.isStatic = true;
        e.vx = 0;
        e.vy = 0;
    }
    return e;
}

function spawnWave(index) {
    if (index >= waves.length) return;
    const cfg = waves[index];
    for (let i = 0; i < cfg.count; i++) {
        const t = pickRandomType(cfg.types);
        enemies.push(createShieldedEnemy(t));
    }
    currentWave = index + 1;
    waveIndicator.innerText = `Волна ${currentWave}`;
}

function init() {
    hud = new HUD();
    player = new Player(canvas.width / 2, canvas.height / 2, (x, y, angle) => {
        bullets.push({ x: x, y: y, vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10, life: 100 });
        Sound.playerShoot();
    });

    spawnWave(0);
    loop();
}

function loop() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update(canvas.width, canvas.height);
    hud.update(player);

    // Player death
    if (player.hp <= 0) {
        isGameOver = true;
        Sound.defeat();
        document.getElementById('death-overlay').style.display = 'flex';
        return;
    }

    // Enemies update/draw
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        // If marked static (squares for this level), skip AI update but draw
        if (e.isStatic) {
            if (e.draw) e.draw(ctx);
        } else {
            if (e.update) e.update(player);
            if (e.draw) e.draw(ctx);
        }

        // Draw shield overlay if present
        if (e.hasShield) {
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.beginPath();
            ctx.strokeStyle = e.shieldColor;
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.9;
            ctx.arc(0, 0, (e.radius || (e.size||20)) + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.restore();
        }

        // Move-on-screen checks for some enemy types that expect scroll speed (not here)

        // Collision with player (ram to break shield)
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (dist < player.size + (e.radius || 20)) {
                if (e.hasShield) {
                    // Remove shield instead of damaging player
                    e.hasShield = false;
                    spawnParticles(e.x, e.y, 12, '#FFFFFF');
                    Sound.shieldBlock();
                // Bounce enemy away
                const angle = Math.atan2(e.y - player.y, e.x - player.x);
                e.vx = Math.cos(angle) * 10;
                e.vy = Math.sin(angle) * 10;
            } else {
                // Normal collision: damage player and knockback enemy
                player.takeDamage(10);
                spawnParticles(player.x, player.y, 10, '#F00');
                e.vx = (e.x - player.x) / dist * 8;
                e.vy = (e.y - player.y) / dist * 8;
            }
        }
    }

    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();

        let removed = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            const dx = e.x - b.x; const dy = e.y - b.y; const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (e.radius || 20) + 4) {
                if (e.hasShield) {
                    // Bullets are deflected by shield
                    spawnParticles(b.x, b.y, 6, '#FFFFFF');
                    Sound.shieldBlock();
                    bullets.splice(i, 1);
                    removed = true;
                    break;
                } else {
                    // Can damage only after shield broken
                    if (e.takeDamage) e.takeDamage();
                    spawnParticles(e.x, e.y, 6, '#FFF');
                    bullets.splice(i, 1);
                    removed = true;
                    if (e.hp <= 0) {
                        // spawn pickup with 50% chance
                        if (Math.random() < 0.5) pickups.push({ x: e.x, y: e.y, vx: 0, vy: 1.5, life: 600, amt: 10, label: 'xp' });
                        enemies.splice(j, 1);
                        spawnParticles(e.x, e.y, 15, '#FF4444');
                        Sound.enemyDeath();
                    }
                    break;
                }
            }
        }
        if (b.life <= 0 && !removed) bullets.splice(i, 1);
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        ctx.fillStyle = '#F44'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();

        const dx = player.x - b.x; const dy = player.y - b.y; const dist = Math.sqrt(dx * dx + dy * dy);
        if (player.isShielding && player.shieldCooldown <= 0 && dist < player.size * 1.5 + 5) {
            player.hitShield();
            spawnParticles(b.x, b.y, 5, '#AAA');
            Sound.shieldBlock();
            enemyBullets.splice(i, 1);
            continue;
        }
        if (dist < player.size + 5) {
            player.takeDamage(5);
            spawnParticles(player.x, player.y, 8, '#F00');
            Sound.playerHit();
            enemyBullets.splice(i, 1);
        }
        if (b.life <= 0) enemyBullets.splice(i, 1);
    }

    // Particles draw/update
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
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

    // Wave progression
    if (enemies.length === 0) {
        if (currentWave < waves.length) {
            spawnWave(currentWave); // spawn next index
        } else {
            // victory
            isGameOver = true;
            Sound.victory();
            document.getElementById('victory-overlay').style.display = 'flex';
            return;
        }
    }

    player.draw(ctx);
    requestAnimationFrame(loop);
}

// Exit handler
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') location.href = '../../ui_menu/html/index.html';
});

init();
