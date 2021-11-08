"use strict";
/*Bàn cờ*/
function Chessboard() {
  var _this = this;

  var pieces; //yếu tố quân cờ
  var piecesnum; //Phần tử hiển thị số màu đen và trắng
  var side; //Cho biết phần tử của trình phát

  _this.toDown = null; //Nằm xuống

  //Ràng buộc sự kiện nhấp chuột
  function bindEvent(td) {
    for (var i = 0; i < 64; i++)
      (function (i) {
        td[i].onclick = function () {
          if (pieces[i].className == "prompt")
            //Đây thực sự là chơi cờ khi bạn nhấp vào
            _this.toDown(i); //Hướng dẫn chơi cờ vua
        };
      })(i);
    td = undefined;
  }

  //Tạo bàn cờ
  _this.create = function () {
    var obj = document.getElementById("chessboard");
    var html = "<table>";
    for (var i = 0; i < 8; i++) {
      html += "<tr>";
      for (var j = 0; j < 8; j++)
        html += "<td class='bg" + ((j + i) % 2) + "'><div></div></td>";
      html += "</tr>";
    }

    html += "</table>";
    obj.innerHTML = html;
    pieces = obj.getElementsByTagName("div");
    bindEvent(obj.getElementsByTagName("td"));

    piecesnum = document.getElementById("console").getElementsByTagName("span");
    side = {
      1: document.getElementById("side1"),
      "-1": document.getElementById("side2"),
    };
  };
  //Cập nhật bảng
  _this.update = function (m, nop) {
    for (var i = 0; i < 64; i++)
      pieces[i].className = ["white", "", "black"][m[i] + 1];
    if (!nop) for (var n in m.next) pieces[n].className = "prompt";
    for (var i = 0; i < m.newRev.length; i++)
      pieces[m.newRev[i]].className += " reversal";
    if (m.newPos != -1) pieces[m.newPos].className += " newest";
    piecesnum[0].innerHTML = m.black;
    piecesnum[1].innerHTML = m.white;
    side[m.side].className = "cbox side";
    side[-m.side].className = "cbox";
  };
}

//Bàn cờ logic
function Othello() {
  var _this = this;

  var map = [];
  var history = [];

  var zobrist = new Zobrist();
  _this.aiSide = 0; //先行方：1: 电脑为黑棋,  -1: 电脑为白棋,  0: 双人对战 2: 电脑自己对战

  var aiRuning = false; //AI.....
  var aiRuningObj = document.getElementById("airuning"); //Đó là để chỉ ra rằng một hộp nhắc xuất hiện
  var passObj = document.getElementById("pass"); //Trả lại cái này khi không có cờ

  var timer; //Id hẹn giờ: thời gian trò chơi

  var aiNum = 1; //số lượng ai

  _this.play = function () {
    //Bắt đầu một trò chơi mới: tất cả dữ liệu khởi tạo đều ở đây, đây là chính

    if (aiRuning)
      //Bỏ qua nếu ai đang chạy
      return;
    clearTimeout(timer); //Xóa bộ hẹn giờ
    console.clear();

    //Khởi tạo bảng
    map = [];
    for (var i = 0; i < 64; i++) map[i] = 0; //空格为 0
    map[28] = map[35] = 1; //Đen 1
    map[27] = map[36] = -1; //Trắng -1

    map.black = map.white = 2; //Số lượng tốt đen và trắng
    map.space = 60; //Số lượng khoảng trống (64 ô, nhưng ở đầu có 4 ô)

    map.frontier = [];
    var tk = [18, 19, 20, 21, 26, 29, 34, 37, 42, 43, 44, 45]; //Dữ liệu tạm thời để khởi tạo
    for (var i = 0; i < 12; i++) map.frontier[tk[i]] = true;

    map.side = 1; //Kỳ thủ hiện tại (1. Cờ đen 0. Cờ trắng)
    map.newPos = -1; //Vị trí gần đây nhất
    map.newRev = []; //Vị trí của mảnh đảo chiều mới nhất
    map.nextIndex = []; //Chuyển động tiếp theo ở đâu
    map.next = {}; //Các mảnh đảo ngược có thể di chuyển trong bước tiếp theo
    map.nextNum = 0; //Số lượng nước đi có sẵn cho nước đi tiếp theo
    map.prevNum = 0; //Số lần di chuyển có thể thực hiện trong nước đi trước đó
    map.key = [0, 0]; //Giá trị khóa được sử dụng để thay thế bảng

    history = []; //kỷ lục lịch sử

    update(); //cập nhật cập nhật dữ liệu khởi tạo ở trên
  };

  function update() {
    //Mỗi khi bảng được cập nhật: hãy đánh giá xem nó có thể hoạt động hay không,
    var aiAuto = _this.aiSide == map.side || _this.aiSide == 2;
    //Điều này có nghĩa là aiAuto = quá trình sau (bên ai = bên giữ bản đồ hiện tại; hoặc bên ai == 2, nghĩa là khi máy tính đang đấu với chính nó, thì nó trở thành sự thật)
    _this.findLocation(map);
    setAIRunStatus(false); //Đừng thể hiện rằng ai đang tính toán
    setPassStatus(false);
    board.update(map, aiAuto); //ai chơi cờ vua: vượt qua trong bản đồ và chức năng aiAuto
    // console.log(map.nextIndex)

    if (map.space == 0 || (map.nextNum == 0 && map.prevNum == 0)) {
      //Bàn cờ đầy hoặc không người chơi nào di chuyển được
      timer = setTimeout(gameOver, 450);
      return;
    }
    if (map.nextNum == 0) {
      //Không di chuyển để vượt qua
      timer = setTimeout(function () {
        _this.pass(map);
        update();
        setPassStatus(true);
      }, 450);
      return;
    }

    if (aiAuto) {
      //Đó là, nó bắt đầu thực thi khi aiAuto là true
      aiRuning = true;
      timer = setTimeout(function () {
        setAIRunStatus(true); //AI bắt đầu chạy
        timer = setTimeout(aiRun, 50); //Nơi này là ai di chuyển
      }, 400);
    }
  }

  function aiRun() {
    //Máy tính di chuyển
    if (map.nextNum == 1)
      //Bạn có thể đi chỉ với một lần di chuyển, còn điều gì khác để tìm kiếm?
      _this.go(map.nextIndex[0]);
    else if (map.space <= 58)
      if (_this.aiNum == 1) {
        //Điều này là để bắt đầu sử dụng startSearch để di chuyển cờ vua sau hai nước đi

        //Thiết lập AI
        _this.go(ai6.startSearch(map));
      } else {
        _this.go(ai6.startSearch(map));
      }
    //Hai lần di chuyển đầu tiên được thực hiện ngẫu nhiên
    else _this.go(map.nextIndex[(Math.random() * map.nextIndex.length) >> 0]);
  }
  // document.getElementById("ai").onclick = aiRun;

  function gameOver() {
    setAIRunStatus(false); //Đừng thể hiện rằng ai đang tính toán
    setPassStatus(false); //Không hiển thị vượt qua
    alert(
      "Kết thúc trò chơi\n\nĐen: " +
        map.black +
        " \nTrắng: " +
        map.white +
        " \n\n" +
        (map.black == map.white
          ? "平局!!!"
          : map.black > map.white
          ? "Chiến thắng cờ đen!!!"
          : "Chiến thắng cờ trắng!!!")
    );
  }

  _this.dire = (function () {
    //Lấy lưới theo một hướng nhất định của một bàn cờ nhất định. Nếu nó vượt quá ranh giới, hãy trả về 64
    var dr = [-8, -7, 1, 9, 8, 7, -1, -9];
    var bk = [8, 0, 0, 0, 8, 7, 7, 7];
    return function (i, d) {
      i += dr[d];
      return (i & 64) != 0 || (i & 7) == bk[d] ? 64 : i;
    };
  })();

  _this.findLocation = function (m) {
    //Tìm nơi để di chuyển
    function is(i, j) {
      var lk = 0;
      while ((i = _this.dire(i, j)) != 64 && m[i] == -m.side) {
        ta[la++] = i;
        lk++;
      }
      if (i == 64 || m[i] != m.side) la -= lk;
    }
    m.nextIndex = [];
    m.next = [];

    //Thiết lập AI
    if (_this.aiNum == 1) {
      var hist = ai6.history[m.side == 1 ? 0 : 1][m.space];
    } else {
      var hist = ai6.history[m.side == 1 ? 0 : 1][m.space];
    }

    for (var i = 0; i < 60; i++) {
      var fi = hist[i];
      if (!m.frontier[fi]) continue;
      var ta = [],
        la = 0;
      for (var j = 0; j < 8; j++) is(fi, j);
      if (la > 0) {
        if (la != ta.length) ta = ta.slice(0, la);
        m.next[fi] = ta;
        m.nextIndex.push(fi); //
      }
    }
    m.nextNum = m.nextIndex.length; //Đây là để sử dụng thông qua
  };

  _this.pass = function (m) {
    //Nếu một bên không có cờ để đi, hãy vượt qua
    m.side = -m.side; //Người chơi cờ
    m.prevNum = m.nextNum; //Thứ tự của các bản ghi lịch sử là một tiếp theo
    zobrist.swap(m.key); //Gọi phương thức chủ sở hữu trao đổi trong hàm zobrist
  };

  _this.newMap = function (m, n) {
    //Quay lại một trò chơi mới
    //m là bản đồ, n là vị trí của nước đi tiếp theo

    var nm = m.slice(0);
    nm[n] = m.side;

    nm.key = m.key.slice(0);
    //Sao chép mảng
    zobrist.set(nm.key, m.side == 1 ? 0 : 1, n);

    nm.frontier = m.frontier.slice(0);
    nm.frontier[n] = false;
    for (var i = 0; i < 8; i++) {
      var k = _this.dire(n, i);
      if (k != 64 && nm[k] == 0) nm.frontier[k] = true;
    }

    var ne = m.next[n];
    var l = ne.length;
    for (var i = 0; i < l; i++) {
      nm[ne[i]] = m.side; //Cầm đồ ngược
      zobrist.set(nm.key, 2, ne[i]);
    }

    //Sau đây tính toán số lượng khoảng trắng, số lượng nước đi màu đen và số lượng nước đi màu trắng
    if (m.side == 1) {
      nm.black = m.black + l + 1;
      nm.white = m.white - l;
    } else {
      nm.white = m.white + l + 1;
      nm.black = m.black - l;
    }

    nm.space = 64 - nm.black - nm.white; //Số lượng khoảng trắng
    nm.side = -m.side;
    nm.prevNum = m.nextNum;

    zobrist.swap(nm.key); //Chủ sở hữu trao đổi
    return nm;
  };

  _this.goChess = function (n) {
    //Di chuyển
    history.push(map);
    _this.go(n);
  };

  _this.go = function (n) {
    //Di chuyển

    aiRuning = false;

    var rev = map.next[n];

    map = _this.newMap(map, n);
    map.newRev = rev;
    map.newPos = n;

    update();
  };

  _this.historyBack = function () {
    if (aiRuning || history.length == 0) return;
    clearTimeout(timer);
    map = history.pop();
    update();
  };

  function setAIRunStatus(t) {
    //Đặt trạng thái hoạt động của AI
    aiRuningObj.style.display = t ? "block" : "none";
  }

  function setPassStatus(t) {
    //Đặt trạng thái vượt qua: vượt qua nếu không có cờ để chơi
    passObj.style.display = t ? "block" : "none";
    if (t)
      passObj.innerHTML =
        map.side == 1
          ? "Trắng không có nước đi để chơi, và Đen tiếp tục chơi"
          : "Đen không có nước đi để chơi, và Trắng tiếp tục chơi";
  }
}

function Zobrist() {
  //Zobrist
  var _this = this;

  var swapSide = [rnd(), rnd()];
  var zarr = [[], [], []];

  for (var pn = 0; pn < 64; pn++) {
    zarr[0][pn] = [rnd(), rnd()];
    zarr[1][pn] = [rnd(), rnd()];
    zarr[2][pn] = [
      zarr[0][pn][0] ^ zarr[1][pn][0],
      zarr[0][pn][1] ^ zarr[1][pn][1],
    ]; // Khi lật từng vị trí
  }

  function rnd() {
    //Nhận một số ngẫu nhiên 32 bit
    return (Math.random() * 0x100000000) >> 0;
  }

  _this.swap = function (key) {
    //Xoay người chơi
    key[0] ^= swapSide[0];
    key[1] ^= swapSide[1];
  };

  _this.set = function (key, pc, pn) {
    key[0] ^= zarr[pc][pn][0];
    key[1] ^= zarr[pc][pn][1];
  };
}

/*main*/
var board = new Chessboard();
var ai6 = new AI6();
var othe = new Othello();

board.create();
board.toDown = othe.goChess;

document.getElementById("play").onclick = function () {
  document.getElementById("selectbox").style.display = "block";
};
document.getElementById("ok").onclick = function () {
  //Sau khi chọn mức độ khó, bấm OK sau khi bạn đã chơi theo trình tự.
  document.getElementById("selectbox").style.display = "none";
  var ro = document.getElementById("selectbox").getElementsByTagName("input");

  othe.aiSide = ro[0].checked ? -1 : 1; //Đi đầu tiên

  for (var i = 2; i < ro.length; i++) if (ro[i].checked) break;
  othe.aiNum = i - 1;
  if (i == 2) {
    ai6.calculateTime = 20;
    ai6.outcomeDepth = 7;
    othe.play();
  } else if (i == 3) {
    ai6.calculateTime = 5000;
    ai6.outcomeDepth = 15;
    othe.play();
  } else if (i == 4) {
    //ai6.calculateTime = 5000
    //ai6.outcomeDepth = 15
    othe.play();
  } else if (i == 5) {
    //ai6.calculateTime = 5000
    //ai6.outcomeDepth = 15
    othe.play();
  } else if (i == 6) {
    //ai6.calculateTime = 5000
    //ai6.outcomeDepth = 15
    othe.play();
  } else if (i == 7) {
    //ai6.calculateTime = 5000
    //ai6.outcomeDepth = 15
    othe.play();
  } else if (i == 8) {
    //ai6.calculateTime = 5000
    //ai6.outcomeDepth = 15
    othe.play();
  }
};
document.getElementById("cancel").onclick = function () {
  //Click cancel để thoát
  document.getElementById("selectbox").style.display = "none";
};

document.getElementById("back").onclick = function () {
  othe.historyBack();
};

// document.getElementById("no3d").onclick = function () {
//   //3D棋盘切换
//   var desk = document.getElementById("desk");
//   desk.className = desk.className == "fdd" ? "" : "fdd";
//   this.innerHTML = desk.className == "fdd" ? "2D" : "3D";
// };
