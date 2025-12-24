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
let boss;
let minions = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let isGameOver = false;
let bossDefeated = false;

// Boss HP UI
const bossHPBar = document.getElementById('boss-hp-bar');

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

    player = new Player(canvas.width / 2, canvas.height - 150, (x, y, angle) => {
        bullets.push({
            x: x, y: y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            life: 100
        });
        Sound.playerShoot();
    });

    // Spawn Boss at top center
    boss = new BossEnemy(canvas.width / 2, 150, (x, y, vx, vy) => {
        enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, life: 300 });
    });

    loop();
}

function spawnMinion(x, y) {
    minions.push(new CircleEnemy(x, y));
}

function updateBossHP() {
    if (boss) {
        const percent = (boss.hp / boss.maxHP) * 100;
        bossHPBar.style.width = `${percent}%`;
    }
}

function loop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update player
    player.update(canvas.width, canvas.height);
    hud.update(player);

    // Check player death
    if (player.hp <= 0) {
        isGameOver = true;
        Sound.defeat();
        document.getElementById('death-overlay').style.display = 'flex';
        return;
    }

    // Update Boss
    if (boss && boss.hp > 0) {
        boss.update(player, spawnMinion);
        boss.draw(ctx);
        updateBossHP();
    } else if (boss && boss.hp <= 0 && !bossDefeated) {
        bossDefeated = true;
        spawnParticles(boss.x, boss.y, 50, '#FF4444');
        Sound.bossDeath();
        const bossX = boss.x;
        const bossY = boss.y;
        boss = null;
        // Kill all minions
        minions.forEach(m => spawnParticles(m.x, m.y, 10, '#FFF'));
        minions = [];
        // Clear enemy bullets
        enemyBullets = [];
        // Update boss HP bar to 0
        bossHPBar.style.width = '0%';
        // Show victory after short delay
        setTimeout(() => {
            Sound.victory();
            document.getElementById('victory-overlay').style.display = 'flex';
            isGameOver = true;
        }, 500);
    }

    // Update Minions
    for (let i = minions.length - 1; i >= 0; i--) {
        let m = minions[i];
        m.update(player);
        m.draw(ctx);
    }

    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();

        // Hit Boss?
        if (boss && boss.hp > 0) {
            const dx = boss.x - b.x;
            const dy = boss.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < boss.radius + 4) {
                boss.takeDamage();
                spawnParticles(b.x, b.y, 3, boss.getColor());
                bullets.splice(i, 1);
                continue;
            }
        }

        // Hit Minion?
        for (let j = minions.length - 1; j >= 0; j--) {
            let m = minions[j];
            const dx = m.x - b.x;
            const dy = m.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < m.radius + 4) {
                m.takeDamage();
                spawnParticles(m.x, m.y, 5, '#FFF');
                bullets.splice(i, 1);
                if (m.hp <= 0) {
                    minions.splice(j, 1);
                    spawnParticles(m.x, m.y, 15, '#FFF');
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

        // Draw with boss color
        ctx.fillStyle = boss ? boss.getColor() : '#FF4444';
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();

        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let hit = false;
        // Shield check (360 degrees)
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
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life <= 0) particles.splice(i, 1);
    }

    player.draw(ctx);
    requestAnimationFrame(loop);
}

// Exit
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        location.href = '../../ui_menu/html/index.html';
    }
});

init();
