# 大頭跑者

把路跑照片裡的頭放大，做成大頭梗圖。全程在瀏覽器裡處理，照片不會上傳。

## 功能
- 匯入照片後自動偵測人臉（face-api.js，SSD MobileNet v1），並把框擴大到包含頭髮與帽子
- 可手動拖曳補框、移動、刪除；多人照片每個頭各自調整放大倍率、下移、左右位移與羽化
- 頭太靠近時可自動縮小或推開，也能指定誰蓋在最上層
- 產生圖片後，手機長按、電腦按右鍵即可儲存

## 使用
需要透過網址開啟（模型檔用 `fetch` 載入，直接雙擊 `index.html` 不會動）：

```
cd bighead
python3 -m http.server 8000
# 瀏覽器開啟 http://localhost:8000
```

也可以用 GitHub Pages 發佈，網址會是 `/bighead/`。

## 檔案
- `index.html`：整個程式（介面與合成邏輯）
- `lib/face-api.js`：`@vladmandic/face-api` 1.7.15，MIT 授權
- `models/`：SSD MobileNet v1 模型權重，來自同一個專案
