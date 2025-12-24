const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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
let levelComplete = false; // Fix: Prevent multiple listeners

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

    // Clean inputs?

    player = new Player(canvas.width / 2, canvas.height / 2, (x, y, angle) => {
        bullets.push({
            x: x, y: y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            life: 100
        });
        Sound.playerShoot();
    });

    // Spawn Enemies (Wave 1)
    // 5 Triangles, 5 Circles, 1 Boss Square
    for (let i = 0; i < 5; i++) enemies.push(new TriangleEnemy(Math.random() * canvas.width, Math.random() * canvas.height, (x, y, vx, vy) => {
        enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, life: 200 });
    }));
    for (let i = 0; i < 5; i++) enemies.push(new CircleEnemy(Math.random() * canvas.width, Math.random() * canvas.height));

    enemies.push(new SquareEnemy(canvas.width / 2, 100, (x, y, vx, vy) => {
        enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, life: 300 });
    }));

    loop();
}

function loop() {
    if (isGameOver && !levelComplete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Updates
    player.update(canvas.width, canvas.height);
    hud.update(player);

    if (player.hp <= 0 && !isGameOver) {
        isGameOver = true;
        Sound.defeat();
        document.getElementById('death-overlay').style.display = 'flex';
        return;
    }

    // Check Win
    if (enemies.length === 0 && !levelComplete) {
        levelComplete = true;
        isGameOver = true;
        Sound.victory();
        document.getElementById('victory-overlay').style.display = 'flex';
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

        // Hit Enemy?
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Fix: e.radius needs to be present on ALL enemies (SquareEnemy now has it)
                if (dist < e.radius + 4) {
                    e.takeDamage();
                    spawnParticles(e.x, e.y, 5, '#FFF');
                    bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        // Spawn a small HP pickup (label: xp) with 50% chance
                        if (Math.random() < 0.5) pickups.push({ x: e.x, y: e.y, vx: 0, vy: 1.5, life: 600, amt: 12, label: 'xp', alpha: 1 });
                        enemies.splice(j, 1);
                        spawnParticles(e.x, e.y, 20, '#FFF');
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
            player.takeDamage(5); // Bullet dmg
            spawnParticles(player.x, player.y, 10, '#FFF');
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
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Pickups (hp drops)
    for (let i = pickups.length - 1; i >= 0; i--) {
        let pu = pickups[i];
        pu.x += pu.vx; pu.y += pu.vy; pu.life--;
        // Float a bit
        pu.vy -= 0.02;

        // Draw pickup as small white text
        ctx.save();
        ctx.globalAlpha = Math.max(0, pu.life / 600);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px Arial';
        ctx.fillText(pu.label, pu.x - 8, pu.y);
        ctx.restore();

        const dxp = player.x - pu.x; const dyp = player.y - pu.y; const distp = Math.sqrt(dxp*dxp + dyp*dyp);
        if (distp < player.size + 12) {
            // Heal player moderately
            player.hp = Math.min(player.maxHP, player.hp + pu.amt);
            spawnParticles(player.x, player.y, 8, '#8F8');
            pickups.splice(i, 1);
        }
        if (pu.life <= 0) pickups.splice(i, 1);
    }

    player.draw(ctx);
    gameLoopId = requestAnimationFrame(loop);
}

// Global Exit (Safety)
window.addEventListener('keydown', (e) => {
    if (enemies.length > 0 && e.key === "Escape") {
        location.href = '../../ui_menu/html/index.html';
    }
});

init();
