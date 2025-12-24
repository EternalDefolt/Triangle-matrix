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
let isGameOver = false;

// Scroller mechanics
const trackLength = 60; // seconds to complete
let trackProgress = 0;
let startTime = Date.now();

// Scrolling background stars
let stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 3 + 2
    });
}

// Progress bar
const progressBar = document.getElementById('progress-bar');

// Spawn timer
let spawnTimer = 0;
let difficulty = 1;

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

    // Player starts at bottom center
    player = new Player(canvas.width / 2, canvas.height - 100, (x, y, angle) => {
        bullets.push({
            x: x, y: y,
            vx: Math.cos(angle) * 12,
            vy: Math.sin(angle) * 12,
            life: 80
        });
        Sound.playerShoot();
    });

    loop();
}

function spawnEnemy() {
    const type = Math.random();
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = -50;

    if (type < 0.6) {
        // Fast circle enemy falling down
        const e = new CircleEnemy(x, y);
        e.scrollSpeed = 3 + difficulty * 0.5;
        enemies.push(e);
    } else {
        // Triangle enemy that shoots
        const e = new TriangleEnemy(x, y, (ex, ey, vx, vy) => {
            enemyBullets.push({ x: ex, y: ey, vx: vx, vy: vy + 2, life: 200 });
        });
        e.scrollSpeed = 2 + difficulty * 0.3;
        enemies.push(e);
    }
}

function updateStars() {
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = -10;
            star.x = Math.random() * canvas.width;
        }
    }
}

function drawStars() {
    ctx.fillStyle = '#555';
    for (let star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function loop() {
    if (isGameOver) return;

    // Track progress
    const elapsed = (Date.now() - startTime) / 1000;
    trackProgress = Math.min(elapsed / trackLength, 1);
    progressBar.style.width = `${trackProgress * 100}%`;

    // Increase difficulty over time
    difficulty = 1 + Math.floor(elapsed / 15);

    // Check victory
    if (trackProgress >= 1) {
        isGameOver = true;
        Sound.victory();
        document.getElementById('victory-overlay').style.display = 'flex';
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw scrolling stars
    updateStars();
    drawStars();

    // Player
    player.update(canvas.width, canvas.height);

    // Restrict player to bottom 60% of screen
    if (player.y < canvas.height * 0.4) {
        player.y = canvas.height * 0.4;
    }

    hud.update(player);

    // Check death
    if (player.hp <= 0) {
        isGameOver = true;
        Sound.defeat();
        document.getElementById('death-overlay').style.display = 'flex';
        return;
    }

    // Spawn enemies
    spawnTimer++;
    const spawnRate = Math.max(30, 90 - difficulty * 10);
    if (spawnTimer >= spawnRate) {
        spawnEnemy();
        spawnTimer = 0;
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        // Move down (scroller effect)
        e.y += e.scrollSpeed || 2;
        e.update(player);
        e.draw(ctx);

        // Remove if off screen
        if (e.y > canvas.height + 100) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision with player
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < player.size + e.radius) {
            if (player.isShielding && player.shieldCooldown <= 0) {
                player.hitShield();
                Sound.shieldBlock();
                spawnParticles(e.x, e.y, 10, '#AAA');
                enemies.splice(i, 1);
            } else {
                player.takeDamage(10);
                Sound.playerHit();
                spawnParticles(player.x, player.y, 15, '#F00');
                enemies.splice(i, 1);
            }
        }
    }

    // Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();

        // Hit Enemy
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            const dx = e.x - b.x;
            const dy = e.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < e.radius + 4) {
                e.takeDamage();
                spawnParticles(e.x, e.y, 5, '#FFF');
                bullets.splice(i, 1);
                if (e.hp <= 0) {
                    enemies.splice(j, 1);
                    spawnParticles(e.x, e.y, 20, '#FFF');
                    Sound.enemyDeath();
                }
                break;
            }
        }
        if (b.life <= 0 || b.y < -20) bullets.splice(i, 1);
    }

    // Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        ctx.fillStyle = '#F44';
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

        if (hit || b.life <= 0 || b.y > canvas.height + 20) enemyBullets.splice(i, 1);
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
