"use strict";

/*AI*/
function AI6() {
  var _this = this;
  _this.calculateTime = 1000; //Giới hạn thời gian tính toán của mỗi lần di chuyển
  _this.outcomeDepth = 14; //Độ sâu tìm kiếm cuối cùng
  var outcomeCoarse = 15; //Độ sâu tìm kiếm mẫu tìm kiếm cuối cùng
  var maxDepth;
  var outTime;

  var weight = [6, 11, 2, 2, 3];

  var rnd = [
    // Đỉnh ở góc
    { s: 0, a: 1, b: 8, c: 9, dr: [1, 8] },
    { s: 7, a: 6, b: 15, c: 14, dr: [-1, 8] },
    { s: 56, a: 57, b: 48, c: 49, dr: [1, -8] },
    { s: 63, a: 62, b: 55, c: 54, dr: [-1, -8] },
  ];

  _this.history = [[], []]; //Bảng lịch sử
  for (var i = 0; i < 2; i++)
    // do 2 kiểu chơi
    for (var j = 0; j <= 60; j++)
      _this.history[i][j] = [
        0, 63, 7, 56, 37, 26, 20, 43, 19, 29, 34, 44, 21, 42, 45, 18, 2, 61, 23,
        40, 5, 58, 47, 16, 10, 53, 22, 41, 13, 46, 17, 50, 51, 52, 12, 11, 30,
        38, 25, 33, 4, 3, 59, 60, 39, 31, 24, 32, 1, 62, 15, 48, 8, 55, 6, 57,
        9, 54, 14, 49,
      ];

  var hash = new Transposition(); //Lớp bảng hoán vị

  function sgn(n) {
    //Chức năng tượng trưng
    return n > 0 ? 1 : n < 0 ? -1 : 0;
  }

  _this.startSearch = function (m) {
    //main：Bắt đầu tìm kiếm cây trò chơi: tìm kiếm minimax (hàm đánh giá）
    //+alphabeta + mtd
    var f = 0;
    if (m.space <= _this.outcomeDepth) {
      //Bắt đầu tìm kiếm khi nó nhỏ hơn độ sâu (nghĩa là giai đoạn kết thúc cuối cùng)
      //Thực hiện tìm kiếm cuối cùng
      // outTime = new Date().getTime() + 600000; //Không giới hạn thời gian cho lần tìm kiếm cuối cùng
      maxDepth = m.space;

      if (maxDepth >= outcomeCoarse)
        f = alphaBeta(m, maxDepth, -Infinity, Infinity);
      //alpha-betaCắt tỉa：α=-∞；β=+∞
      else f = mtd(m, maxDepth, f); //mtd(f)

      console.log(
        "Kết quả tìm kiếm cuối cùng:",
        maxDepth,
        m.space,
        m.side,
        f * m.side
      ); //Kết quả tìm kiếm cuối cùng
      return hash.getBest(m.key); //Phương thức getBest của bảng thay thế：
    }

    outTime = new Date().getTime() + _this.calculateTime;
    maxDepth = 0;

    try {
      while (maxDepth < m.space) {
        f = mtd(m, ++maxDepth, f); //mtd(f)

        var best = hash.getBest(m.key);
        console.log(maxDepth, f * m.side, best);
      }
    } catch (eo) {
      if (eo.message != "time out") throw eo;
    }

    console.log("kết quả tìm kiếm:", maxDepth - 1, m.space, m.side, f * m.side); //kết quả tìm kiếm
    return best; //Tọa độ bước tốt nhất là gì?
  };

  function evaluation(m) {
    //Hàm đánh giá
    var corner = 0,
      steady = 0,
      uk = {}; //Chức năng định giá uk
    for (var i = 0, v, l = rnd.length; (v = rnd[i]), i < l; i++) {
      if (m[v.s] == 0) {
        corner += m[v.a] * -3; //Nguy hiểm thứ cấp
        corner += m[v.b] * -3; //Nguy hiểm thứ cấp
        corner += m[v.c] * -6; //Nguy hiểm thứ cấp
        continue;
      }
      corner += m[v.s] * 15; //góc
      steady += m[v.s];

      for (var k = 0; k < 2; k++) {
        if (uk[v.s + v.dr[k]]) continue;
        var eb = true,
          tmp = 0;
        for (var j = 1; j <= 6; j++) {
          var t = m[v.s + v.dr[k] * j];
          if (t == 0) break;
          else if (eb && t == m[v.s]) steady += t;
          else {
            eb = false;
            tmp += t;
          }
        }
        if (j == 7 && m[v.s + v.dr[k] * 7] != 0) {
          steady += tmp;
          uk[v.s + v.dr[k] * 6] = true;
        }
      }
    }

    var frontier = 0; //Biên giới
    for (var i = 9; i <= 54; i += (i & 7) == 6 ? 3 : 1) {
      if (m[i] == 0) continue;
      for (var j = 0; j < 8; j++)
        if (m[othe.dire(i, j)] == 0) {
          frontier -= m[i];
          break;
        }
    }

    var mobility = (m.nextNum - m.prevNum) * m.side; //Lực lượng hành động

    var parity = m.space < 18 ? (m.space % 2 == 0 ? -m.side : m.side) : 0; //Ngang bằng

    var rv =
      corner * weight[0] +
      steady * weight[1] +
      frontier * weight[2] +
      mobility * weight[3] +
      parity * weight[4];

    return rv * m.side;
  }

  function outcome(m) {
    //Kết quả cuối cùng
    var s = m.black - m.white;
    if (maxDepth >= outcomeCoarse) return sgn(s) * 10000 * m.side;
    return (s + m.space * sgn(s)) * 10000 * m.side;
  }

  function mtd(m, depth, f) {
    //https://askeplaat.wordpress.com/534-2/mtdf-algorithm/
    //Thuật toán này là sự tối ưu hóa của việc cắt tỉa alpha
    var lower = -Infinity;
    var upper = Infinity;
    do {
      var beta = f == lower ? f + 1 : f; // Xác định giá trị heuristic
      f = alphaBeta(m, depth, beta - 1, beta);
      if (f < beta) upper = f;
      else lower = f;
    } while (lower < upper);

    return f;
  }

  function alphaBeta(m, depth, alpha, beta) {
    //Alpha-beta Cắt tỉa

    if (new Date().getTime() > outTime) throw new Error("time out");

    var hv = hash.get(m.key, depth, alpha, beta); //Phương thức get của bảng thay thế
    if (hv !== false) return hv;

    if (m.space == 0)
      //Bàn cờ đầy đủ
      return outcome(m); //Quay lại trực tiếp kết quả cuối cùng

    othe.findLocation(m);

    if (m.nextNum == 0) {
      //Đánh giá rằng không có động thái
      if (m.prevNum == 0)
        //Phán đoán không có động thái nào chuyển nước đi trước.
        return outcome(m); //Quay lại trực tiếp kết quả cuối cùng
      othe.pass(m); //Thực thi bỏ qua
      return -alphaBeta(m, depth, -beta, -alpha);
    }

    if (depth <= 0) {
      //Độ sâu tìm kiếm đạt đến giới hạn đã đặt
      var e = evaluation(m);
      hash.set(m.key, e, depth, 0, null); // Đặt phương pháp thay thế bảng
      return e; //Trả lại giá trị đánh giá khi nó đạt đến giá trị sâu nhất
    }

    var hd = hash.getBest(m.key); //Những gì được cho làphashe.best
    if (hd !== null) moveToHead(m.nextIndex, hd); //Đến nút trên cùng

    var hist = _this.history[m.side == 1 ? 0 : 1][m.space]; //Bảng heuristic lịch sử được chỉ định cho history
    var hashf = 1; //Loại định giá tốt nhất, 0 là giá trị chính xác, 1 là <= alpha, 2 là> = beta
    var bestVal = -Infinity; //Ghi lại mức định giá tốt nhất
    var bestAct = null; //Ghi lại động thái tốt nhất
    for (var i = 0; i < m.nextNum; i++) {
      //Liên tục tìm kiếm cắt tỉa cho lớp tiếp theo
      var n = m.nextIndex[i];
      var v = -alphaBeta(othe.newMap(m, n), depth - 1, -beta, -alpha);
      if (v > bestVal) {
        bestVal = v;
        bestAct = n;
        if (v > alpha) {
          alpha = v;
          hashf = 0; //Cung cấp giá trị chính xác
          moveToUp(hist, n); //Quay lại nút trên
        }
        if (v >= beta) {
          hashf = 2;
          break; //Cắt tỉa xảy ra
        }
      }
    }
    moveToHead(hist, bestAct); //Quay lại nút trên cùng
    hash.set(m.key, bestVal, depth, hashf, bestAct); //Phương thức thiết lập của bảng thay thế: bestAct được trả về từ đây
    return bestVal; // giống với giá trị cuối cùng của đánh giá trên
  }

  function moveToHead(arr, n) {
    //alphabeta Được sử dụng để quay lại cấp cao nhất của cây
    if (arr[0] == n) return;
    var i = arr.indexOf(n);
    arr.splice(i, 1);
    arr.unshift(n);
  }

  function moveToUp(arr, n) {
    //alphabeta Nó được sử dụng để quay lại nút trên
    if (arr[0] == n) return;
    var i = arr.indexOf(n);
    arr[i] = arr[i - 1];
    arr[i - 1] = n;
  }
}

function Transposition() {
  //Bảng hoán vị
  var _this = this;
  var HASH_SIZE = (1 << 19) - 1; //Số đơn vị thay thế là 524287
  var data = new Array(HASH_SIZE + 1);

  _this.set = function (key, eva, depth, flags, best) {
    var keyb = key[0] & HASH_SIZE;
    var phashe = data[keyb];
    if (!phashe) phashe = data[keyb] = {};
    else if (phashe.key == key[1] && phashe.depth > depth)
      //Nếu bản ghi sâu hơn bản ghi hiện tại,
      //		nó sẽ không được thay thế

      return;
    phashe.key = key[1];
    phashe.eva = eva;
    phashe.depth = depth;
    phashe.flags = flags;
    phashe.best = best;
  };

  _this.get = function (key, depth, alpha, beta) {
    var phashe = data[key[0] & HASH_SIZE];
    if (!phashe || phashe.key != key[1] || phashe.depth < depth) return false;
    switch (phashe.flags) {
      case 0:
        return phashe.eva;
      case 1:
        if (phashe.eva <= alpha) return phashe.eva;
        return false;
      case 2:
        if (phashe.eva >= beta) return phashe.eva;
        return false;
    }
  };

  _this.getBest = function (key) {
    var phashe = data[key[0] & HASH_SIZE];
    if (!phashe || phashe.key != key[1]) return null;
    return phashe.best;
  };
}
