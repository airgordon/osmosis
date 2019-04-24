let canvasHeight;
let canvasWidth;

let myImageData;

const comparator = (x, y) => x.r.y - y.r.y;
const E = l => l.map(x => x.m * x.v.lengthSq()).reduce((acc, value) => acc + value) / 2;
const p = l => l.map(x => x.v.clone().multiplyScalar(x.m)).reduce((acc, value) => acc.add(value), new Victor(0, 0));

init();

function init() {

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvasHeight = canvas.height;
  canvasWidth = canvas.width;

  console.log(canvasWidth, canvasHeight);

  myImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

  initScene(ctx);
}

function initScene(ctx) {
  canvasHeight = canvas.height;
  canvasWidth = canvas.width;

  const g1 = new Victor(canvasWidth / 2, canvasHeight / 20);
  const v1 = new Victor(0.1, 1);
  const ball1 = new Ball(g1, v1, "blue");

  // const scene = [];
  const scene = [ball1];

  while (scene.length < 1) {
    const x = new Victor(0, 0).randomize(new Victor(0, 0), new Victor(canvasWidth, canvasHeight));
    const v = new Victor(0, 0).randomize(new Victor(-1, 1), new Victor(1, -1));

    let ball = new Ball(x, v);

    ball.color = x.y > canvasHeight / 2 ? "red" : "blue";
    ball.m = x.y > canvasHeight / 2 ? 2 : 1;

    for (const movable of scene) {
      if (movable.r.distanceSq(ball.r) <= 4 * movable.R * ball.R) {
        ball = null;
        break;
      }
    }
    if (ball)
      scene.push(ball);
  }

  scene.push(new Membrane(new Victor(canvasWidth / 2, canvasHeight * 0.4), new Victor(0, 0), "blue"));

  loop(scene, (scene) => drawScene(scene, ctx));

}

function loop(scene, drawer) {

  const now = new Date();

  const dt = 1;
  const g = 0;

  scene.sort(comparator);

  for (const movable of scene) {
    movable.v.addScalarY(g * dt);

    const dr = movable.v.clone();
    dr.multiplyScalar(dt);
    movable.r.add(dr);
  }

  for (let i = 0; i < scene.length; i++) {
    const movable = scene[i];

    collideWithBorder(movable);

    for (let j = i; j < scene.length; j++) {
      const otherMovable = scene[j];

      if (movable.r.y - otherMovable.r.y > movable.R + otherMovable.R)
        break;

      if (movable === otherMovable)
        continue;

      if (Ball.prototype.isPrototypeOf(movable)) {
        if (Ball.prototype.isPrototypeOf(otherMovable)) {
          if (intersectBalls(movable, otherMovable))
            collideBalls(otherMovable, movable, dt);

        } else {
          if (intersectBallWithMembrane(movable, otherMovable))
            collideBallWithMembrane(movable, otherMovable, dt);
        }
      } else {
        if (intersectBallWithMembrane(otherMovable, movable))
          collideBallWithMembrane(otherMovable, movable, dt);
      }
    }
  }

  console.log(`E= ${E(scene)}`);

  drawer(scene);

  setTimeout(loop, Math.max(0, 100 + new Date() - now), scene, drawer);

}

function intersectBallWithMembrane(ball, membrane) {
  return ball.color === membrane.color && Math.abs(ball.r.y - membrane.r.y) < ball.R + membrane.R;
}

function intersectBalls(b1, b2) {
  const r12 = b1.R + b2.R;
  return b1.r.distanceSq(b2.r) <= r12 * r12;
}

function touchObjects(m1, m2, c) {
  const v1_before_M = m1.v.clone().subtract(m2.v); // скорость мяча в СО мембраны
  const v2_before_M = m2.v.clone().subtract(m2.v); // скорость мемб в СО мембраны (всегда 0)

  const vn1_before_M = v1_before_M.dot(c);
  const vn2_before_M = v2_before_M.dot(c); // (всегда 0)

  const b_mult = (m1.m - m2.m) / (m1.m + m2.m);
  const m_mult = 2 * m1.m / (m1.m + m2.m);

  const vn1_after_M = c.clone().multiplyScalar(vn1_before_M * b_mult); // нормальная скорость мяча после столкновения в СО мембраны
  const vn2_after_M = c.clone().multiplyScalar(vn1_before_M * m_mult); // нормальная скорость мемб после столкновения в СО мембраны

  const vn1_after_I = vn1_after_M.add(m2.v); // нормальная скорость мяча после столкновения в неподвижной СО
  const vn2_after_I = vn2_after_M.add(m2.v); // нормальная скорость мемб после столкновения в неподвижной СО

  const dv1 = c.clone().multiplyScalar(vn1_before_M * b_mult - vn1_before_M); // приращение скорости мяча после столкновения
  const dv2 = c.clone().multiplyScalar(vn1_before_M * m_mult - vn2_before_M); // приращение скорости мемб после столкновения
  return {dv1, dv2};
}

function collideBalls(b1, b2, dt) {
  const dr = b2.r.clone().subtract(b1.r);
  const c = dr.clone().norm();

  const vn1i = c.dot(b1.v);
  const vn2i = c.dot(b2.v);

  let t = (dr.length() - b1.R - b2.R) / (vn1i - vn2i);
  if (isNaN(t) || !isFinite(t)) {
    t = 0;
  }
  {
    const dr1 = b1.v.clone();
    dr1.multiplyScalar(t);
    b1.r.add(dr1);
  }
  {
    const dr2 = b2.v.clone();
    dr2.multiplyScalar(t);
    b2.r.add(dr2);
  }

  const {dv1, dv2} = touchObjects(b1, b2, c);

  b1.v.add(dv1);
  b2.v.add(dv2);

  {
    const dr = b1.v.clone();
    dr.multiplyScalar(dt - t);
    b1.r.add(dr);
  }
  {
    const dr = b2.v.clone();
    dr.multiplyScalar(dt - t);
    b2.r.add(dr);
  }
}

function collideWithBorder(ball) {
  if (ball.r.x < 0) {
    ball.r.x = -ball.r.x;
    ball.v.x = -ball.v.x;
  }

  if (ball.r.x >= canvasWidth) {
    ball.r.x = canvasWidth - (ball.r.x - canvasWidth);
    ball.v.x = -ball.v.x;
  }

  if (ball.r.y < 0) {
    ball.r.y = -ball.r.y;
    ball.v.y = -ball.v.y;
  }

  if (ball.r.y >= canvasHeight) {
    ball.r.y = canvasHeight - (ball.r.y - canvasHeight);
    ball.v.y = -ball.v.y;
  }
}

function getCollisionLine(b1, b2) {
  const dr = b1.r.clone().subtract(b2.r);

  if (!Ball.prototype.isPrototypeOf(b1) || !Ball.prototype.isPrototypeOf(b2))
    dr.x = 0;

  return dr.clone().norm();
}

function collideBallWithMembrane(b1, b2, dt) {
  const p1 = p([b1, b2]);
  const E1 = E([b1, b2]);

  const c = getCollisionLine(b1, b2);

  const dr = b1.r.clone().subtract(b2.r);
  const distance = Math.abs(c.dot(dr));

  // перемещаем объекты к точке столкновения
  const vn1 = c.dot(b1.v);
  const vn2 = c.dot(b2.v);

  let t = (distance - b1.R - b2.R) / (vn2 - vn1);
  if (isNaN(t) || !isFinite(t)) {
    t = 0;
  }
  {
    const dr1 = b1.v.clone();
    dr1.multiplyScalar(t);
    b1.r.add(dr1);
  }
  {
    const dr2 = b2.v.clone();
    dr2.multiplyScalar(t);
    b2.r.add(dr2);
  }

  const {dv1, dv2} = touchObjects(b1, b2, c);

  b1.v.add(dv1);
  b2.v.add(dv2);

  { // пересчитываем перемещение после столкновения по новым скоростям
    const dr = b2.v.clone();
    dr.multiplyScalar(dt - t);
    b2.r.add(dr);
  }
  {
    const dr = b1.v.clone();
    dr.multiplyScalar(dt - t);
    b1.r.add(dr);
  }

  console.log(` dE  = ${E1 - E([b1, b2])}`);
  console.log(`|dp| = ${p1.subtract(p([b1, b2])).lengthSq()}`);
}

function drawScene(scene, ctx) {
  const {data} = myImageData;
  for (let i = 0; i < canvasWidth; i++) {
    for (let j = 0; j < canvasHeight; j++) {
      data[(j * canvasWidth + i) * 4] = 255;
      data[(j * canvasWidth + i) * 4 + 1] = 255;
      data[(j * canvasWidth + i) * 4 + 2] = 255;
      data[(j * canvasWidth + i) * 4 + 3] = 255;
    }
  }

  for (const drawable of scene)
    if (Ball.prototype.isPrototypeOf(drawable))
      drawBall(drawable, myImageData);
    else
      drawMembrane(drawable, myImageData);

  ctx.putImageData(myImageData, 0, 0);
}

function drawBall(ball, imgData) {
  const R = ball.R;
  const sqR = R * R;
  const t = new Victor(0, 0);

  const {data} = imgData;
  let color;

  for (let i = -R; i <= R; i++) {
    for (let j = -R; j <= R; j++) {
      t.x = i;
      t.y = j;
      color = [255, 255, 255, 255];
      if (t.lengthSq() <= sqR) {
        t.add(ball.r);
        t.unfloat();

        if (checkInCanvas(t, canvasWidth, canvasHeight)) {
          color = ball.color === "red" ? [255, 0, 0, 255] : [0, 0, 255, 255];

          data[(t.y * canvasWidth + t.x) * 4] = color[0];
          data[(t.y * canvasWidth + t.x) * 4 + 1] = color[1];
          data[(t.y * canvasWidth + t.x) * 4 + 2] = color[2];
          data[(t.y * canvasWidth + t.x) * 4 + 3] = color[3];
        }
      }
    }
  }
}

function drawMembrane(memb, imgData) {
  const R = memb.R;
  const t = new Victor(0, 0);

  const {data} = imgData;
  let color;

  for (let i = -canvasWidth / 2; i <= canvasWidth / 2; i++) {
    for (let j = -R; j <= R; j++) {
      t.x = i;
      t.y = j;
      color = [255, 255, 255, 255];

      t.add(memb.r);
      t.unfloat();

      if (checkInCanvas(t, canvasWidth, canvasHeight)) {
        color = memb.color === "red" ? [255, 0, 0, 255] : [0, 0, 255, 255];

        data[(t.y * canvasWidth + t.x) * 4] = color[0];
        data[(t.y * canvasWidth + t.x) * 4 + 1] = color[1];
        data[(t.y * canvasWidth + t.x) * 4 + 2] = color[2];
        data[(t.y * canvasWidth + t.x) * 4 + 3] = color[3];
      }
    }
  }
}

function checkInCanvas(r, width, height) {
  return r.x >= 0 && r.y > 0 && r.x < width && r.y < height;
}

function Ball(r, v, color, R) {
  this.r = r;
  this.v = v;
  this.color = color;
  this.R = R | 3;
  this.m = 1;
}

function Membrane(r, v, color) {
  this.r = r;
  this.v = v;
  this.color = color;
  this.R = 5;
  this.m = 1;
}