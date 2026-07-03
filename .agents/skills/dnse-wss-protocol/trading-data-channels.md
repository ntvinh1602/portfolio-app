# Trading Data WebSocket

This document provide specific details of each channels providing trading data.

----

### Tổng quan các kênh dữ liệu

| Kênh dữ liệu (Function)                          | Mô tả (Description)                             | Phân loại (Type) | Tần suất gửi dữ liệu (Frequency)                            |
|--------------------------------------------------|-------------------------------------------------|------------------|-------------------------------------------------------------|
| [Order Event](#order-event)      | Dữ liệu lệnh giao dịch theo thời gian thực      | Real-time        | Cập nhật khi lệnh giao dịch <br/>trên tài khoản có thay đổi |
| [Position Event](#position-event) | Dữ liệu vị thế đang nắm giữ theo thời gian thực | Real-time        | Cập nhật khi vị thế trên tài khoản có thay đổi              |

---

## Các kênh dữ liệu giao dịch

### Order Event

Cung cấp thông tin chi tiết về lệnh giao dịch trên tài khoản người dùng theo thời gian thực. Hệ thống sẽ đẩy dữ liệu ngay khi có sự thay đổi liên quan đến: lệnh mới, thay đổi trạng thái, hoặc thay đổi giá khớp, khối lượng khớp.

#### Channel

>  **order.\{market_type\}.\{encoding\}**

- **market_type**: Phân loại thị trường
  - `STOCK`: Lệnh giao dịch cơ sở
  - `DERIVATIVE`: Lệnh giao dịch phái sinh

- **encoding**: Định dạng dữ liệu `msgpack` hoặc `json`

#### Payload

```json lines
{
  "id": 596,                        // integer  // Id lệnh giao dịch
  "side": "NS",                     // string   // Chiều đặt lệnh (NB: Mua, NS: Bán)
  "accountNo": "0001179019",        // string   // Số tiểu khoản
  "symbol": "41I1G5000",            // string   // Mã chứng khoán
  "orderType": "LO",                // string   // Loại lệnh
  "price": 1920.0,                  // float    // Giá đặt
  "quantity": 5,                    // integer  // Khối lượng đặt
  "fillQuantity": 2,                // integer  // Khối lượng khớp
  "canceledQuantity": 0,            // integer  // Khối lượng đã hủy
  "leaveQuantity": 3,               // integer  // Khối lượng còn lại chưa khớp
  "orderStatus": "PartiallyFilled", // string   // Trạng thái lệnh
  "loanPackageId": 2278,            // integer  // Mã gói vay
  "marketType": "DERIVATIVE",       // string   // Loại thị trường
  "transDate": "2026-04-06T00:00:00Z", // string   // Ngày giao dịch
  "createdDate": "2026-04-13T04:24:05.274Z", // string   // Thời điểm tạo (UTC)
  "modifiedDate": "2026-04-13T04:28:27.749Z" // string   // Thời điểm cập nhật (UTC)
}
```

Để có thêm thông tin về vòng đời lệnh, các trạng thái của lệnh, người dùng tham khảo <a href="https://developers.dnse.com.vn/docs/guide/trading-api/trading_order">tại đây.</a>

### Position Event

Cung cấp thông tin chi tiết về vị thế giao dịch trên tài khoản người dùng theo thời gian thực. Hệ thống sẽ đẩy dữ liệu ngay khi có sự thay đổi liên quan đến: mở vị thế, đóng vị thế, thay đổi khối lượng, giá vốn, giá đóng, giá thị trường hoặc trạng thái vị thế.

#### Channel

>  **position.\{market_type\}.\{encoding\}**

- **market_type**: Phân loại thị trường
  - `STOCK`: Vị thế nắm giữ thị trường cơ sở
  - `DERIVATIVE`: Vị thế nắm giữ thị trường phái sinh
- **encoding**: Định dạng dữ liệu `msgpack` hoặc `json`

#### Payload

##### Vị thế phái sinh

```json lines
{
  "id": 177796763592657,            // integer  // Id vị thế
  "accountNo": "0001179019",        // string   // Số tiểu khoản
  "symbol": "41I1G5000",            // string   // Mã chứng khoán
  "status": "OPEN",                 // string   // Trạng thái vị thế (OPEN: Đang mở, CLOSED: Đã đóng)
  "loanPackageId": 2278,            // integer  // Mã gói vay
  "side": "NB",                     // string   // Chiều vị thế (NB: Mua, NS: Bán)
  "accumulateQuantity": 247,        // integer  // Tổng khối lượng đã mở được cộng dồn trong vị thế
  "tradeQuantity": null,            // integer  // Dành cho thị trường cơ sở
  "closedQuantity": 236,            // integer  // Khối lượng đã đóng
  "costPrice": 2057.72425,          // float    // Giá vốn trung bình
  "marketPrice": 2070.0,            // float    // Giá thị trường hiện tại
  "breakEvenPrice": 2058.21911,     // float    // Giá hòa vốn
  "openQuantity": 11,               // integer  // Khối lượng vị thế đang mở
  "overNightQuantity": 0,           // integer  // Khối lượng mở qua đêm
  "averageClosePrice": 2094.28941,  // float    // Giá đóng trung bình tính trên khối lượng đã đóng
  "marketType": "DERIVATIVE",       // string   // Loại thị trường
  "createdDate": "2026-05-05T09:17:50.457893Z", // string // Thời điểm mở vị thế (UTC)
  "modifiedDate": "2026-05-07T04:19:20.901188117Z" // string // Thời điểm cập nhật gần nhất (UTC)
}
```
##### Vị thế cơ sở

```json lines
{
  "id": 8426,                       // integer  // Id vị thế
  "accountNo": "0001179019",        // string   // Số tiểu khoản
  "symbol": "ACB",                  // string   // Mã chứng khoán
  "status": "OPEN",                 // string   // Trạng thái vị thế  (OPEN: Đang mở, PENDING_CLOSE: Chờ đóng, CLOSED: Đã đóng, ODD_LOT: Lô lẻ đang mở)
  "loanPackageId": 5757,            // integer  // Mã gói vay
  "side": "NB",                     // string   // Chiều vị thế (NB: Mua, NS: Bán)
  "accumulateQuantity": 2400,       // integer  // Tổng khối lượng đã mở được cộng dồn trong vị thế
  "tradeQuantity": 2100,            // integer  // Khối lượng có thể bán
  "closedQuantity": 300,            // integer  // Khối lượng đã đóng
  "costPrice": 23125.210,           // float    // Giá vốn trung bình
  "marketPrice": 23100,             // float    // Giá thị trường hiện tại
  "breakEvenPrice": 23251.3689,     // float    // Giá hòa vốn
  "openQuantity": 2000,             // integer  // Tổng khối lượng mở trong vị thế
  "overNightQuantity": null,        // integer  // Dành cho thị trường phái sinh
  "averageClosePrice": 23816.6667,  // float    // Giá đóng trung bình tính trên khối lượng đã đóng
  "marketType": "STOCK",            // string   // Loại thị trường
  "createdDate": "2025-07-28T06:20:21.655809Z", // string // Thời điểm mở vị thế (UTC)
  "modifiedDate": "2026-05-07T11:10:08.787906Z" // string // Thời điểm cập nhật gần nhất (UTC)
}
```