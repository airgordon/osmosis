let canvasHeight;
let canvasWidth;

let height;
let width;


let myImageData;

const scale = 1;

init();

function init() {

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvasHeight = canvas.height;
  canvasWidth = canvas.width;

  console.log(canvasWidth, canvasHeight);

  myImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const {data} = myImageData;

  height = canvasHeight / scale;
  width = canvasWidth / scale;

  redraw(ctx);
}

function newArr(h, w) {
  let arr1 = new Array(h);
  for (let i = 0; i < h; i++) {
    arr1[i] = new Array(w);
  }
  return arr1;
}

function redraw(ctx) {
  canvasHeight = canvas.height;
  canvasWidth = canvas.width;

  const g1 = new Victor(450, 50);
  const v1 = new Victor(0, 0);
  const ball1 = new Ball(g1, v1);

  const g2 = new Victor(350, 400);
  const v2 = new Victor(-2.5, 1);
  const ball2 = new Ball(g2, v2);

  const scene = [ball2];

  loop(ctx, scene);

}

function loop(ctx, scene) {
  const now = new Date();

  const dt = 1.1;

  for (const movable of scene) {
    const dr = movable.v.clone();
    dr.multiplyScalar(dt);
    movable.r.add(dr);
  }

  for (const movable of scene) {
    if (movable.r.x < 0) {
      movable.r.x = -movable.r.x;
      movable.v.x = -movable.v.x;
    }

    if (movable.r.x >= canvasWidth) {
      movable.r.x = canvasWidth - (movable.r.x - canvasWidth);
      movable.v.x = -movable.v.x;
    }

    if (movable.r.y < 0) {
      movable.r.y = -movable.r.y;
      movable.v.y = -movable.v.y;
    }

    if (movable.r.y >= canvasHeight) {
      movable.r.y = canvasHeight - (movable.r.y - canvasHeight);
      movable.v.y = -movable.v.y;
    }
  }

  for (const drawable of scene)
    drawBall(drawable, myImageData);


  ctx.putImageData(myImageData, 0, 0);
  // ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  setTimeout(loop, Math.max(0, 100 + new Date() - now), ctx, scene);
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
          color = [255, 0, 0, 255];

          data[(t.y * canvasWidth + t.x) * 4] = color[0];
          data[(t.y * canvasWidth + t.x) * 4 + 1] = color[1];
          data[(t.y * canvasWidth + t.x) * 4 + 2] = color[2];
          data[(t.y * canvasWidth + t.x) * 4 + 3] = color[3];
        }
      }
    }
  }

}

function checkInCanvas(r, width, height) {
  return r.x >= 0 && r.y > 0 && r.x < width && r.y < height;
}

function Ball(r, v, R) {
  this.r = r;
  this.v = v;
  this.R = R | 10;
}
