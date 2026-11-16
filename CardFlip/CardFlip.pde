/**
 * CardFlip : 차세대 인터랙티브 3D 디지털 명함 앱 (호스트 서버 및 런처)
 * 
 * [실행 방법]
 * 1. Processing 4 IDE에서 이 스케치(CardFlip.pde)를 엽니다.
 * 2. 좌측 상단의 재생(▶) 버튼을 누릅니다.
 * 3. 내장 웹서버가 가동되며 기본 브라우저가 자동으로 실행됩니다.
 * 4. 스마트폰으로 화면 우측의 QR 코드를 스캔하면 모바일에서도 즉시 시연 가능합니다.
 */

import com.sun.net.httpserver.*;
import java.net.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.text.SimpleDateFormat;

HttpServer server;
int port = 8080;
String localUrl = "";
String phoneUrl = "";
String localIP = "127.0.0.1";
boolean isServerRunning = false;
ArrayList<String> logList = new ArrayList<String>();
PImage qrImage = null;
boolean qrLoadingFailed = false;

// 버튼 영역 좌표
int btnX = 30, btnY = 250, btnW = 160, btnH = 38;

void setup() {
  size(620, 320);
  surface.setTitle("CardFlip Host Server & Launcher - Processing 4");
  
  // 1. 로컬 네트워크 IP 감지
  localIP = detectLocalIP();
  
  // 2. 내장 HTTP 서버 구동 (포트 8080 점유 시 8081, 8082 순차 탐색)
  startEmbeddedServer();
  
  // 3. 브라우저 자동 실행
  if (isServerRunning) {
    link(localUrl);
    addLog("Default Browser Launched: " + localUrl);
  }
  
  // 4. 스마트폰 접속용 QR 코드 비동기 로딩
  thread("loadMobileQR");
}

void draw() {
  background(18, 18, 26);
  
  // 헤더 영역
  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text("CardFlip Server Launcher", 30, 24);
  
  // 서버 가동 상태 배지
  noStroke();
  if (isServerRunning) {
    fill(34, 197, 94, 40);
    rect(330, 22, 140, 26, 13);
    fill(34, 197, 94);
    ellipse(345, 35, 10, 10);
    textSize(12);
    textAlign(LEFT, CENTER);
    text("SERVER RUNNING", 360, 35);
  } else {
    fill(239, 68, 68, 40);
    rect(330, 22, 140, 26, 13);
    fill(239, 68, 68);
    ellipse(345, 35, 10, 10);
    textSize(12);
    textAlign(LEFT, CENTER);
    text("SERVER ERROR", 360, 35);
  }
  
  // 구분선
  stroke(40, 40, 55);
  line(30, 62, 590, 62);
  
  // 좌측: 접속 정보 및 조작
  textAlign(LEFT, TOP);
  fill(160, 160, 180);
  textSize(12);
  text("💻 PC 브라우저 접속 주소", 30, 80);
  
  fill(96, 165, 250);
  textSize(15);
  text(localUrl, 30, 98);
  
  fill(160, 160, 180);
  textSize(12);
  text("📱 스마트폰(동일 Wi-Fi) 접속 주소", 30, 130);
  
  fill(52, 211, 153);
  textSize(15);
  text(phoneUrl, 30, 148);
  
  // 실시간 로그 모니터 박스
  fill(28, 28, 38);
  noStroke();
  rect(30, 180, 380, 56, 8);
  
  fill(140, 140, 160);
  textSize(11);
  textAlign(LEFT, TOP);
  text("📡 실시간 요청 로그:", 40, 188);
  fill(220, 220, 235);
  String lastLog = logList.size() > 0 ? logList.get(logList.size() - 1) : "대기 중...";
  text(lastLog, 40, 206);
  
  // [브라우저 다시 열기] 버튼
  boolean isHover = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
  if (isHover) {
    fill(59, 130, 246);
  } else {
    fill(37, 99, 235);
  }
  noStroke();
  rect(btnX, btnY, btnW, btnH, 8);
  
  fill(255);
  textSize(13);
  textAlign(CENTER, CENTER);
  text("🌐 브라우저 다시 열기", btnX + btnW / 2, btnY + btnH / 2);
  
  // 우측: 스마트폰 접속용 QR 카드 영역
  fill(28, 28, 38);
  rect(435, 78, 155, 210, 12);
  
  fill(200, 200, 220);
  textSize(11);
  textAlign(CENTER, TOP);
  text("스마트폰 카메라로 스캔", 435 + 155 / 2, 90);
  
  if (qrImage != null) {
    image(qrImage, 435 + 15, 110, 125, 125);
  } else if (qrLoadingFailed) {
    fill(100, 100, 120);
    rect(435 + 15, 110, 125, 125, 8);
    fill(200, 200, 220);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("위의 폰 주소로\n직접 접속하세요", 435 + 155 / 2, 172);
  } else {
    fill(40, 40, 55);
    rect(435 + 15, 110, 125, 125, 8);
    fill(140, 140, 160);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("QR 로딩 중...", 435 + 155 / 2, 172);
  }
  
  fill(120, 120, 140);
  textSize(10);
  textAlign(CENTER, TOP);
  text("같은 Wi-Fi 필요", 435 + 155 / 2, 248);
}

void mousePressed() {
  if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
    if (isServerRunning) {
      link(localUrl);
      addLog("Manual Reopen: " + localUrl);
    }
  }
}

// -------------------------------------------------------------
// 서버 시작 및 정적 파일 서빙 로직
// -------------------------------------------------------------
void startEmbeddedServer() {
  int attempts = 0;
  while (attempts < 10 && !isServerRunning) {
    try {
      server = HttpServer.create(new InetSocketAddress(port), 0);
      
      // 정적 파일 핸들러 등록
      server.createContext("/", new StaticFileHandler(sketchPath("data")));
      server.setExecutor(null); // 기본 단일 스레드 executor
      server.start();
      
      isServerRunning = true;
      localUrl = "http://localhost:" + port + "/";
      phoneUrl = "http://" + localIP + ":" + port + "/";
      addLog("Server started successfully on port " + port);
    } catch (IOException e) {
      port++;
      attempts++;
    }
  }
  
  if (!isServerRunning) {
    println("[ERROR] Failed to bind HTTP server port.");
  }
}

// 스마트폰 접속 QR 다운로드 쓰레드
void loadMobileQR() {
  try {
    String qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=" + URLEncoder.encode(phoneUrl, "UTF-8");
    qrImage = loadImage(qrApiUrl, "png");
  } catch (Exception e) {
    qrLoadingFailed = true;
  }
}

// 로컬 IP 감지
String detectLocalIP() {
  try {
    Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
    while (interfaces.hasMoreElements()) {
      NetworkInterface iface = interfaces.nextElement();
      if (iface.isLoopback() || !iface.isUp()) continue;
      Enumeration<InetAddress> addresses = iface.getInetAddresses();
      while (addresses.hasMoreElements()) {
        InetAddress addr = addresses.nextElement();
        if (addr instanceof Inet4Address && !addr.isLoopbackAddress()) {
          return addr.getHostAddress();
        }
      }
    }
  } catch (Exception e) {}
  
  try {
    return InetAddress.getLocalHost().getHostAddress();
  } catch (Exception e) {
    return "127.0.0.1";
  }
}

void addLog(String msg) {
  SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss");
  String time = sdf.format(new Date());
  String entry = "[" + time + "] " + msg;
  logList.add(entry);
  if (logList.size() > 20) {
    logList.remove(0);
  }
  println(entry);
}

// Processing 창 종료 시 서버 안전 종료
void stop() {
  if (server != null) {
    server.stop(0);
    println("[INFO] HTTP Server stopped.");
  }
  super.stop();
}

// -------------------------------------------------------------
// Java 내장 HttpServer용 정적 파일 핸들러
// -------------------------------------------------------------
class StaticFileHandler implements HttpHandler {
  private final String baseDir;
  
  public StaticFileHandler(String baseDir) {
    this.baseDir = baseDir;
  }
  
  @Override
  public void handle(HttpExchange exchange) throws IOException {
    String uriPath = exchange.getRequestURI().getPath();
    if (uriPath.equals("/") || uriPath.isEmpty()) {
      uriPath = "/index.html";
    }
    
    // 보안: 상위 디렉터리 접근(../) 차단
    if (uriPath.contains("..")) {
      sendError(exchange, 403, "Forbidden");
      return;
    }
    
    File file = new File(baseDir + uriPath.replace('/', File.separatorChar));
    if (!file.exists() || file.isDirectory()) {
      sendError(exchange, 404, "Not Found: " + uriPath);
      return;
    }
    
    String contentType = getMimeType(file.getName());
    byte[] bytes = Files.readAllBytes(file.toPath());
    
    // CORS 및 캐싱 헤더
    Headers headers = exchange.getResponseHeaders();
    headers.set("Content-Type", contentType);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    
    exchange.sendResponseHeaders(200, bytes.length);
    OutputStream os = exchange.getResponseBody();
    os.write(bytes);
    os.close();
    
    // 로그 기록
    addLog(exchange.getRequestMethod() + " " + uriPath + " (200 OK)");
  }
  
  private void sendError(HttpExchange exchange, int code, String msg) throws IOException {
    byte[] bytes = msg.getBytes("UTF-8");
    exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
    exchange.sendResponseHeaders(code, bytes.length);
    OutputStream os = exchange.getResponseBody();
    os.write(bytes);
    os.close();
  }
  
  private String getMimeType(String filename) {
    int dotIdx = filename.lastIndexOf('.');
    if (dotIdx == -1) return "application/octet-stream";
    String ext = filename.substring(dotIdx + 1).toLowerCase();
    switch (ext) {
      case "html": return "text/html; charset=UTF-8";
      case "js":   return "application/javascript; charset=UTF-8";
      case "css":  return "text/css; charset=UTF-8";
      case "json": return "application/json; charset=UTF-8";
      case "png":  return "image/png";
      case "jpg":
      case "jpeg": return "image/jpeg";
      case "svg":  return "image/svg+xml";
      case "ico":  return "image/x-icon";
      case "woff2":return "font/woff2";
      case "woff": return "font/woff";
      default:     return "application/octet-stream";
    }
  }
}
