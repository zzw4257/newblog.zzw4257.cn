
# 引子与前置知识

## 前言

Misc题目通常包括侦察（recon）、取证（forensics）、隐写术（stego），有时也包含一些经典的密码学题目。这里我们今天从大家已经有的基础出发，抛砖引玉的介绍三个misc的小领域：比图片隐写稍微稀有亿点的音频隐写，需要一些创意的流量分析以及比较偏的智能合约安全类题目。

在开始正题前，我们用20分钟快速过一下基础：

- 编码和python基础
- 一些命令行
- 常见工具介绍
- 隐写的一些万能钥匙？
- wireshark
- 网络协议
- 区块链和以太坊

## 编码和python基础

### 编码

编码是信息在不同形式之间转换的过程。在隐写分析中，识别和解码各种编码是至关重要的第一步。常见的编码包括：

- **ASCII（ American Standard Code for Information Interchange）:** 最基础的字符编码，每个字符用一个字节表示。
- **Unicode:** 包含世界上几乎所有字符的编码标准，常见的实现有 UTF-8, UTF-16, UTF-32。
- **Base64:** 将二进制数据编码成 ASCII 字符，常用于在文本协议中传输二进制数据。
- **Hexadecimal (十六进制):** 将二进制数据用 0-9 和 A-F 表示，方便阅读和编辑。
- **Binary (二进制):** 最底层的表示形式，由 0 和 1 组成。
- **URL Encoding:** 用于在 URL 中传递参数，将特殊字符转换为 `%` 加上其十六进制表示。
- **Morse Code (莫尔斯电码)：** 一种用短点和长划表示字符的编码方式，常用于无线电通信。


编码间转化的工具很多，如python和在线工具如cyberchef等

python自带比较健全的库

```python
import base64
import binascii
import urllib.parse

# 字符串转换为 Base64 编码
string = "Hello World"
encoded_string = base64.b64encode(string.encode('utf-8')).decode('utf-8')
print(f"Base64 编码: {encoded_string}")

# Base64 编码转换为字符串
decoded_string = base64.b64decode(encoded_string).decode('utf-8')
print(f"Base64 解码: {decoded_string}")

# 字符串转换为十六进制编码
hex_string = binascii.hexlify(string.encode('utf-8')).decode('utf-8')
print(f"十六进制编码: {hex_string}")

# 十六进制编码转换为字符串
decoded_string = binascii.unhexlify(hex_string).decode('utf-8')
print(f"十六进制解码: {decoded_string}")

# 字符串转换为 URL 编码
url_encoded_string = urllib.parse.quote(string)
print(f"URL 编码: {url_encoded_string}")

# URL 编码转换为字符串
decoded_string = urllib.parse.unquote(url_encoded_string)
print(f"URL 解码: {decoded_string}")

# 字符串转换为二进制
binary_string = ''.join(format(ord(char), '08b') for char in string)
print(f"二进制编码: {binary_string}")
```

### 文件头

- **定义：** 文件头，也称为 Magic Bytes，是位于文件开头的几个字节，用于标识文件类型。操作系统和应用程序通过读取文件头来确定文件的格式，从而选择合适的解析器进行处理。
- **作用：**
    - **文件类型识别：** 快速准确地识别文件类型。
    - **防止错误解析：** 避免使用错误的解析器打开文件，导致数据损坏或程序崩溃。
    - **安全检查：** 用于安全检查，防止恶意文件伪装成其他类型的文件。
- **相关概念**：
    - **`file` 命令：** Linux 的 `file` 命令通过读取文件头来识别文件类型。
    - **内核处理：** Linux 内核在处理文件时，也会检查文件头，以确定文件的处理方式。

| 文件类型                                | 十六进制文件头                                   | ASCII 表示            |
| ----------------------------------- | ----------------------------------------- | ------------------- |
| JPEG                                | `FF D8 FF E0`                             |                     |
| PNG                                 | `89 50 4E 47 0D 0A 1A 0A`                 | `.PNG....`          |
| GIF                                 | `47 49 46 38 37 61` 或 `47 49 46 38 39 61` | `GIF87a` 或 `GIF89a` |
| ZIP                                 | `50 4B 03 04`                             | `PK..`              |
| RAR                                 | `52 61 72 21 1A 07 00`                    | `Rar!....`          |
| BMP                                 | `42 4D`                                   | `BM`                |
| TIFF                                | `49 49 2A 00` 或 `4D 4D 00 2A`             | `II*.` 或 `MM.*`     |
| PDF                                 | `25 50 44 46 2D 31 2E`                    | `%PDF-1.`           |
| Microsoft Office (doc, xls, ppt)    | `D0 CF 11 E0 A1 B1 1A E1`                 |                     |
| Microsoft Office (docx, xlsx, pptx) | `50 4B 03 04`                             | `PK..`              |
| MP3                                 | `49 44 33`                                | `ID3`               |
| MP4                                 | `00 00 00 18 66 74 79 70 6D 70 34 32`     |                     |
| ELF                                 | `7F 45 4C 46`                             | `.ELF`              |
| Java Class                          | `CA FE BA BE`                             |                     |
| Python 编译文件                         | `33 0D 0D 0A 00 00 00 00 00 00 00 00`     |                     |

### 文件结构

- **ELF (Executable and Linkable Format)**
    - **协议：** ELF 是一种用于可执行文件、共享库和目标文件的标准格式。
    - **结构：**
        - **ELF Header：** 包含文件类型、目标架构、入口点地址等信息。
        - **Program Header Table：** 描述程序的内存布局，包括代码段、数据段等。
        - **Section Header Table：** 描述文件的各个节（Section），如代码节、数据节、符号表等。
        - **Data Sections：** 包含实际的代码和数据。
    - **相关概念**：
        - **`ld-linux.so`：** 动态链接器，用于加载和链接共享库。
        - **`objdump` 命令：** 用于查看 ELF 文件的结构和内容。
        - **`readelf` 命令：** 用于查看 ELF 文件的头部信息。

- **JPEG (Joint Photographic Experts Group)**
    - **协议：** JPEG 是一种有损压缩的图像格式，广泛用于存储照片。
    - **结构：**
        - **SOI (Start of Image)：** `FF D8`，表示图像的开始。
        - **APPn (Application Segment)：** `FF E0` - `FF EF`，包含应用程序特定的信息，如 EXIF 数据。
        - **DQT (Define Quantization Table)：** `FF DB`，定义量化表，用于压缩图像数据。
        - **SOF0 (Start of Frame 0)：** `FF C0`，定义图像的帧信息，如图像宽度、高度、颜色分量等。
        - **DHT (Define Huffman Table)：** `FF C4`，定义 Huffman 表，用于压缩图像数据。
        - **SOS (Start of Scan)：** `FF DA`，表示扫描数据的开始。
        - **Compressed Image Data：** 压缩后的图像数据。
        - **EOI (End of Image)：** `FF D9`，表示图像的结束。
    - **相关概念：**
        - **`libjpeg` 库：** 用于 JPEG 图像的编码和解码。
        - **`exiftool` 命令：** 用于读取和修改 JPEG 图像的 EXIF 数据。

- **ZIP (ZIP File Format)**
    - **协议：** ZIP 是一种常见的压缩文件格式，用于将多个文件和目录打包成一个文件。
    - **结构：**
        - **Local File Header：** 描述每个文件的信息，如文件名、压缩方法、文件大小等。
        - **Compressed Data：** 压缩后的文件数据。
        - **Central Directory：** 包含所有文件的目录信息，用于快速访问文件。
        - **End of Central Directory Record：** 描述 Central Directory 的位置和大小。
    - **Linux 中的应用：**
        - **`zip` 命令：** 用于创建 ZIP 文件。
        - **`unzip` 命令：** 用于解压 ZIP 文件。

上述内容大家可以用010 editor来感受和验证

此外我们再介绍下音频相关的一些文件结构：

**WAV格式**

WAV（Waveform Audio File Format）是微软和IBM联合开发的无损音频文件格式，广泛应用于Windows平台。WAV文件遵循RIFF（Resource Interchange File Format）规范，主要由以下部分组成：

• **RIFF块**：文件的起始部分，包含文件标识符“RIFF”和文件大小等信息。

• **格式块（fmt chunk）**：描述音频数据的格式信息，如音频编码、声道数、采样率、位深度等。

• **数据块（data chunk）**：存储实际的音频数据。

  


**MP3格式**

  

MP3（MPEG Audio Layer III）是一种有损压缩音频格式，通过移除人耳不易察觉的声音信息来减少文件大小。MP3文件由多个帧组成，每个帧包含一个帧头和对应的音频数据：

• **帧头**：每帧的起始部分，包含同步信息、版本、层、比特率、采样率、声道模式等参数。

• **音频数据**：紧随帧头之后，是经过压缩编码的音频信息。

  

此外，MP3文件可能包含可变比特率（VBR）信息头，如XING或VBRI头，用于指示文件的比特率模式和相关信息。

  

**AIFF格式**

  

AIFF（Audio Interchange File Format）是苹果公司开发的无损音频文件格式，主要用于Macintosh平台。AIFF文件的结构包括：

• **FORM块**：文件的起始部分，包含标识符“FORM”和文件大小等信息。

• **Common块**：描述音频的基本参数，如声道数、采样率、样本位数等。

• **Sound Data块**：存储实际的音频样本数据。

  

AIFF文件的设计强调高质量音频存储，常用于专业音频应用。
  

FLV（Flash Video）是一种流媒体容器格式，常用于在线视频播放。FLV文件中的音频数据以标签（Tag）的形式存在，每个音频标签包含：

• **音频标签头（Audio Tag Header）**：2个字节，指示音频编码类型、采样率、采样精度和声道类型等信息。

• **音频数据（Audio Data）**：紧随标签头之后，存储实际的音频数据，编码格式可以是AAC、MP3等。

这种标签化的结构使FLV能够高效地封装和传输音频数据。

### python 部分库介绍
####  1. struct 模块

- **补充说明：** `struct` 模块用于在 Python 值和 C 结构体之间进行转换，可以将数据打包成字节串，也可以从字节串中解包数据。
    
- **常用格式字符：**
    
    - `i`: int
    - `I`: unsigned int
    - `h`: short
    - `H`: unsigned short
    - `c`: char
    - `s`: char[]
    - `f`: float
    - `d`: double
    - `>`: big-endian
    - `<`: little-endian
- **Python 示例：**

```python
import struct

# 打包数据
data = struct.pack('>IHH', 1, 2, 3)  # 大端序，unsigned int, unsigned short, unsigned short
print(f"打包后的数据: {data}")

# 解包数据
unpacked_data = struct.unpack('>IHH', data)
print(f"解包后的数据: {unpacked_data}")
```
    

#### 2. bytearray 字节数组

- **补充说明：** `bytearray` 是可变的字节序列，可以方便地修改二进制数据。
    
- **常用方法：**
    
    - `append(int)`: 在末尾添加一个字节。
    - `extend(iterable)`: 在末尾添加多个字节。
    - `insert(index, int)`: 在指定位置插入一个字节。
    - `pop(index)`: 移除指定位置的字节。
    - `remove(int)`: 移除第一个匹配的字节。
- **Python 示例：**

```python
data = bytearray(b'\x01\x02\x03')
print(f"原始数据: {data}")

data.append(0x04)
print(f"添加一个字节: {data}")

data.extend([0x05, 0x06])
print(f"添加多个字节: {data}")

data.insert(1, 0x00)
print(f"插入一个字节: {data}")

data.pop(2)
print(f"移除一个字节: {data}")
```
    

#### 3. 位运算

- **补充说明：** 位运算是直接对二进制位进行操作，常用于修改和提取隐藏信息。
    
- **常用位运算符：**
    
    - `&` (AND): 按位与
    - `|` (OR): 按位或
    - `^` (XOR): 按位异或
    - `~` (NOT): 按位取反
    - `<<` (Left Shift): 左移
    - `>>` (Right Shift): 右移
- **Python 示例：**
    
```python
# 提取 LSB (Least Significant Bit)
def get_lsb(byte):
    return byte & 1

# 设置 LSB
def set_lsb(byte, bit):
    byte = (byte & ~1) | bit
    return byte

byte = 0b11010110
lsb = get_lsb(byte)
print(f"原始字节: {bin(byte)}")
print(f"LSB: {lsb}")

new_byte = set_lsb(byte, 1)
print(f"修改后的字节: {bin(new_byte)}")
```
    

#### 4. 隐写术示例：LSB 隐写

- **补充说明：** LSB (Least Significant Bit) 隐写是最简单的隐写技术之一，通过修改图像像素的最低有效位来隐藏信息。
    
- **Python 示例：**
    
```python
from PIL import Image

def hide_message(image_path, message, output_path):
    img = Image.open(image_path).convert('RGB')
    data = img.getdata()

    binary_message = ''.join(format(ord(char), '08b') for char in message)
    message_length = len(binary_message)

    if message_length > len(data) * 3:
        raise ValueError("Message too long to hide in image")

    new_data = []
    data_index = 0
    for pixel in data:
        r, g, b = pixel

        if data_index < message_length:
            r = (r & ~1) | int(binary_message[data_index])
            data_index += 1
        if data_index < message_length:
            g = (g & ~1) | int(binary_message[data_index])
            data_index += 1
        if data_index < message_length:
            b = (b & ~1) | int(binary_message[data_index])
            data_index += 1

        new_data.append((r, g, b))

    img.putdata(new_data)
    img.save(output_path, "PNG")

def extract_message(image_path):
    img = Image.open(image_path).convert('RGB')
    data = img.getdata()

    binary_message = ""
    for pixel in data:
        r, g, b = pixel
        binary_message += str(r & 1)
        binary_message += str(g & 1)
        binary_message += str(b & 1)

    # 提取消息长度
    message_length = len(binary_message)
    extracted_message = ""
    for i in range(0, message_length, 8):
        byte = binary_message[i:i + 8]
        if len(byte) == 8:
            extracted_message += chr(int(byte, 2))
        else:
            break

    return extracted_message

# 示例用法
hide_message("original.png", "Hello World!", "stego.png")
extracted_message = extract_message("stego.png")
print(f"提取的消息: {extracted_message}")
```

## 隐写基础

## 一些命令行指令与概念

一切开始之前，一些非常基础的东西不能忘

- 奇怪的二进制串出现前，可以`xxd`转hex,然后考虑当成文件处理
- ...

### **Steghide**

- **功能：** 一款流行的隐写工具，可以将数据隐藏在 JPEG、BMP、WAV 和 AU 文件中。
	
- **特点：** 支持密码保护，使用统计建模技术来最小化对载体文件的修改。
	
- **常用命令：**
	
	- `steghide embed -cf <载体文件> -ef <隐藏文件> -sf <输出文件> -p <密码>`：将隐藏文件嵌入到载体文件中。
		
	- `steghide extract -sf <隐写文件> -p <密码>`：从隐写文件中提取隐藏文件。
		
	- `steghide info <隐写文件>`：查看隐写文件的信息。
		
- **示例：**
```bash
	# 嵌入文件  
	steghide embed -cf image.jpg -ef secret.txt -sf stego.jpg -p password  
	​  
	# 提取文件  
	steghide extract -sf stego.jpg -p password
```
        
### **Zsteg**
    
- **功能：** 专门用于检测 PNG 和 BMP 图像中的隐写数据。
	
- **特点：** 可以检测 LSB 隐写、位平面隐写等多种隐写技术。
	
- **常用命令：**
	
	- `zsteg <图像文件>`：检测图像中的隐写数据。
		
	- `zsteg -a <图像文件>`：尝试所有可能的隐写方法。
		
	- `zsteg -E <隐写方法> <图像文件>`：使用指定的隐写方法提取数据。
		
- **示例：**
	```bash

	# 检测隐写数据  
	zsteg image.png  
	​  
	# 尝试所有可能的隐写方法  
	zsteg -a image.png  
	​  
	# 使用指定的隐写方法提取数据  
	zsteg -E b1,rgb,lsb,xy image.png```
        
### **ExifTool**
    
- **功能：** 用于读取、写入和编辑各种文件的元数据，包括图像、音频和视频文件。
	
- **特点：** 支持多种元数据格式，如 EXIF、IPTC、XMP。
	
- **常用命令：**
	
	- `exiftool <文件>`：显示文件的元数据。
		
	- `exiftool -<元数据标签>=<值> <文件>`：修改文件的元数据。
		
	- `exiftool -all= <文件>`：删除文件的所有元数据。
		
- **示例：**
	```bash

	# 显示元数据  
	exiftool image.jpg  
	​  
	# 修改元数据  
	exiftool -Comment="Hidden message" image.jpg  
	​  
	# 删除所有元数据  
	exiftool -all= image.jpg```
        
### **Binwalk**
    
- **功能：** 用于扫描文件中的嵌入文件和代码。
	
- **特点：** 可以识别多种文件类型和压缩格式，常用于固件分析和隐写分析。
	
- **常用命令：**
	
	- `binwalk <文件>`：扫描文件中的嵌入文件。
		
	- `binwalk -e <文件>`：自动提取嵌入文件。
		
	- `binwalk -D <文件类型> <文件>`：只提取指定类型的文件。
		
- **示例：**
	```bash

	# 扫描文件  
	binwalk image.jpg  
	​  
	# 自动提取嵌入文件  
	binwalk -e image.jpg  
	​  
	# 只提取 ZIP 文件  
	binwalk -D zip image.jpg```
        
### **Strings**
    
- **功能：** 用于提取文件中的可打印字符。
	
- **特点：** 可以快速查找文件中的文本信息，常用于发现隐藏的字符串。
	
- **常用命令：**
	
	- `strings <文件>`：提取文件中的可打印字符。
		
	- `strings -n <最小长度> <文件>`：只提取长度大于等于最小长度的字符串。
		
	- `strings -o <文件>`：显示字符串的偏移量。
		
- **示例：**
	```bash
	# 提取可打印字符  
	strings image.jpg  
	​  
	# 只提取长度大于等于 5 的字符串  
	strings -n 5 image.jpg  
	​  
	# 显示字符串的偏移量  
	strings -o image.jpg
	```

## 010 editor
- **功能：** 强大的十六进制编辑器，支持模板解析文件结构。
- **特点：** 可以直观地查看和修改文件的二进制数据，支持多种文件格式的模板。
- **常用功能：**
	- **十六进制编辑：** 查看和修改文件的十六进制数据。
	- **模板解析：** 使用模板解析文件结构，方便理解文件格式。
	- **数据比较：** 比较两个文件的差异。
- **示例：**
	- 使用 010 Editor 打开文件，查看文件头和数据。
	- 使用模板解析文件结构，查找隐藏的数据。
	- 修改文件头，伪造文件类型。



## 万能钥匙
你可能好奇一些比较通用/集成的工具/网站，列在这里：


- [Aperi'Solve](https://aperisolve.com/) ： 综合隐写分析平台。
- [dCode](https://www.dcode.fr/)：一个充满神秘感的，小工具多到爆的网站。
- [Steganography Online](https://stylesuxx.github.io/steganography/) ：隐写（嵌入隐写内容）在线小工具。
- **Kali Linux：** 一个集成了大量安全工具的 Linux 发行版，包括各种隐写分析工具。
- **Autopsy：** 一款开源的数字取证平台，可以分析磁盘镜像、文件系统和文件。
- **Volatility：** 一款内存取证框架，可以分析计算机内存中的数据。
- **CyberChef：** 一款 Web 应用，提供了大量的编码、加密和解密工具，可以用于处理各种数据。

## Wireshark使用

非常直白的一套逻辑

首先选捕获的网卡，这里一般是en0命名的代表我们的主网卡

![[Pasted image 20250406005721.png]]

进去之后就可以用显示过滤器来进行数据包范围的限制和精细化，这里有几种输入方法

- 直接过滤器栏中输入（ctrl/cmd+F调出）
常见的表达 `eth.dst/addr`  `tcp.dstport` `tcp/udp...` `udp.length` `http.request.method/url`
![[Pasted image 20250406010033.png]]
- 选中header中需要的字段，进行选中非选中（可带有且，或属性）
![[Pasted image 20250406010513.png]]
- 在数据包内容中选择需要字段，类似操作
![[Pasted image 20250406010653.png]]

具体搜索一般用字符串，然后需要设置搜索的位置是列表，详情还是字节流

![[Pasted image 20250406010946.png]]

对HTTP和TCP流量可以使用追踪流进行简单的还原

![[Pasted image 20250406011148.png]]

这里一个小问题，怎么在1.12.12.21本身不带有效Host字段的情况下获悉这个服务的具体内容，如何解码这个未加密的传输内容，大家可以自己结合`whois`等工具尝试获取一些额外信息。


![[Pasted image 20250406013031.png]]

导出特定分组，特别好用的东西，记得需要停止捕获，然后可以导出选中的或者所有之类的

这里有一个点可能产生混淆，抓包过滤器和显示过滤器，请大家自行查看

我们后续的流量分析是直接在pcap包上进行的

最后还有些页面值得介绍，协议分级统计

![[Pasted image 20250406013418.png]]

会话 Conversation，这里可以方便的看固定ip对之间发生的数据交换信息

![[Pasted image 20250406013820.png]]

其他涉及到的功能都各自有特定的使用场景

## 区块链和Ethereum基础介绍




# 音频隐写

常见工具：mp3stego，Audacity，AU（就是那个Adobe的），SilentEye，DeepSound

### 工具一：mp3 隐写

下载[工具](https://www.petitcolas.net/steganography/mp3stego/)

也可以源码入手

[fabienpe/MP3Stego: Tool to hide data in MP3files](https://github.com/fabienpe/MP3Stego)

本机演示比较麻烦，整体流程就是一个隐写一个解码，属于是黑盒工具

```bash
encode -E hidden_text.txt -P pass svega.wav svega_stego.mp3 
decode -X -P pass svega_stego.mp3

```
![[Pasted image 20250406023701.png]]

可以作为 strings - 音频试听 - 波形一场观察后的另一个尝试途径

这里 -P 后面追加的密码可能是一个突破口，strings啥的都试一下，相关试题
- ISCC-2016: Music Never Sleep
- **[FSCTF 2023]夜深人静的时候也会偷偷emo**

反正纯工具，这两题也是纯工具题

然后一个复杂点的题

[XCTF-XMan2016“攻防未来”夏令营-i春秋](https://www.ichunqiu.com/xman/index/2016-8-8)里面的，题找不到了，反正就是Mp3Stego解密，解密结果网址的二维码扫描二进制xxd转编译结果然后反编译并运行，属于是套娃了

### 工具二：SilentEye LSB音频隐写

没啥好说的，广东省强网杯 - 2015: Little Apple，一个集成工具箱

### 波形隐写

- BuuCTF - 假如给我三天光明
- ISCC 2017：普通的 DISCO
- JarvisOJ2016  [godwave.wav.26b6f50dfb87d00b338b58924acdbea1](https://dn.jarvisoj.com/challengefiles/godwave.wav.26b6f50dfb87d00b338b58924acdbea1)

这个我其实不知道怎么总结，第二个例题这个，我带着涟二代听的，杂音巨大，然后我就直接看了下波形

![[Pasted image 20250406025444.png]]

感觉就很明显传递什么信息，一开始猜的摩斯密码，但是感觉不对劲，然后就当成01

```
110011011011001100001110011111110111010111011000010101110101010110011011101011101110110111011110011111101
```

然后转char,很显然不对，7位前补个0（相当于不当成unsigned char了）
就是

![[Pasted image 20250406025859.png]]
完事

这个第三个比较玄妙，搜了下题解是丢到matlab里捣鼓，大家有兴趣可以自行尝试

### 频谱隐写
- Hear With Your Eyes[攻防世界](https://adworld.xctf.org.cn/challenges/list)

我评价是过于直白![[Pasted image 20250406030941.png]]



# 流量分析和取证

### 方法简述

整体上分为下列步骤

- 数据包修复
- 总体分析（直接对应了两个自带功能）
	- 协议分级
	- 端点分析
- 过滤器分析
- 异常查询
	- 协议字段
	- 异常字符串
	- 特殊服务器
- 直接/间接提取flag

问题的核心在于针对核心协议采取特定分析方法

### PCAP 文件修复

这个主要吃手册，需要了解[这里](https://ietf-opsawg-wg.github.io/draft-ietf-opsawg-pcap/draft-ietf-opsawg-pcap.html)

使用中利用工具 https://f00l.de/hacking/pcapfix.php

或者部署到本地 [Rup0rt/pcapfix at devel](https://github.com/Rup0rt/pcapfix/tree/devel)

#### **HTTP 协议分析**
- **端口修正**：HTTP默认端口为 **80**。
- **关键特征**：
  - 明文传输，可通过 `http` 过滤器直接查看请求内容（如GET/POST参数、Cookie、User-Agent等）。
  - **文件提取技巧**：  
    - 使用 `文件 -> 导出对象 -> HTTP` 批量导出传输的文件（如图片、压缩包、脚本）。
    - 过滤 `http contains "flag"` 搜索敏感关键词。
  - **POST请求分析**：在数据包详情中展开 `Hypertext Transfer Protocol -> Line-based text data` 查看表单提交内容。

---

#### **HTTPS 协议分析**
- **密钥获取方法**：
  1. **SSL/TLS 密钥日志**：若流量捕获时启用了 `SSLKEYLOGFILE` 环境变量，可直接在Wireshark中配置密钥路径（`编辑 -> 首选项 -> TLS -> (Pre)-Master-Secret log filename`）。
  2. **RSA 私钥**：若有服务器私钥，可通过 `TLS 会话密钥` 配置解密。
- **证书泄露**：部分CTF题目可能在证书字段（如 `Common Name`）中隐藏flag。
- **协议特征**：过滤 `tls.handshake` 分析TLS握手过程，观察支持的加密套件。

---

#### **FTP 协议分析**
- **端口说明**：
  - **21端口**：控制连接（传输命令，如 `USER`/`PASS`）。
  - **20端口**：数据连接（传输文件，需分析 `PORT`/`PASV` 模式确定目标IP和端口）。
- **敏感信息提取**：
  - 过滤 `ftp.request.command == "USER" || ftp.request.command == "PASS"` 快速定位账号密码。
  - 使用 `文件 -> 导出对象 -> FTP` 还原传输的文件。
- **被动模式（PASV）**：注意数据连接的临时端口范围（如 `227 Entering Passive Mode (192,168,1,2,123,45)` 对应端口 `123*256 +45 = 31533`）。

---

#### **DNS 协议分析**
- **协议细节**：
  - 默认使用 **UDP 53端口**，但大响应可能切换至TCP。
  - 过滤 `dns` 查看查询记录，关注 `A`、`TXT`、`CNAME` 类型。
- **隐蔽信道检测**：
  - **长域名**：如 `bG9uZ19kb21haW5fYmFzZTY0LmNvbQ==.example.com` 可能含Base64编码数据。
  - **高频请求**：异常频繁的DNS请求可能为隧道工具（如DNSExfil、iodine）特征。
  - **TXT记录**：过滤 `dns.qry.type == 16` 检查是否有隐藏信息。

---

#### **WIFI 协议分析**
- **四次握手包提取**：
  - 过滤 `eapol` 查找四次握手包（目标为关联客户端MAC与AP的BSSID）。
  - 导出为 `cap` 文件，使用 `aircrack-ng -w wordlist.txt capture.cap` 爆破密码。
- **WPA3 注意**：若题目为WPA3协议，需确保工具支持（如最新版Hashcat）。
- **非握手包利用**：部分题目可能隐藏未加密的802.11帧（如广播信标帧中的SSID含flag）。

---

#### **USB 协议分析**
- **HID设备解析**：
  - **键盘输入**：根据 `HID Data` 字段的按键码（需参考USB HID文档转换ASCII字符）。
    - 示例：过滤 `usb.transfer_type == 0x01 && usb.dst == "host"` 定位键盘输入数据。
  - **鼠标轨迹**：解析 `X/Y` 坐标偏移量，绘制轨迹图（可使用Python脚本自动化）。
- **U盘文件操作**：捕获 `USB Mass Storage` 流量，还原文件读写操作（如通过 `tshark -r capture.pcapng -Y "usb.capdata" -T fields -e usb.capdata > data.txt` 导出数据）。
- 特点是设备间差别巨大，不同题目间吃的协议特征可能差别巨大

#### **ICMP 协议分析**
- **隐蔽隧道**：过滤 `icmp` 检查数据部分（如Ping请求中的附加数据或ICMP隧道工具如icmpsh）。
- **TTL与分片**：异常TTL值或分片包可能为题目干扰项。

#### **TCP/UDP 流还原**
- 右键数据包选择 `追踪流 -> TCP/UDP流`，切换原始视图查看完整会话（如Telnet明文登录、Redis未授权访问）。


#### 协议分析通用技巧
1. **统计视图**：使用 `统计 -> 协议分级` 快速定位主要协议。
2. **字符串搜索**：按 `Ctrl+F` 搜索十六进制或字符串（如flag、ctf）。
3. **时间排序**：按时间排序数据包，观察异常时间间隔或突发流量。

#### 最后一步——数据提取

对于数据提取，从tshark/wireshark基于筛选器自动提取，到导出特定分组字节手动提取，是一个非常复杂且需要灵感的事情，这里不做过多解释，在这个过程中相对于gui的wireshark更好用的是命令行版本tshark


### CTF-wiki经典例子—— findtheflag

这里就用一个没有利用协议特征的例子演示一下，其余例子大家可以自行学习

![[Pasted image 20250406020559.png]]

直接跳转到修复完成这一步

![[Pasted image 20250406021131.png]]

查一下tcp同一个流串起来的结果找到where is my flag的奇怪内容

后续就是比较基于观察的想法，发现跟踪不同的流，stream从31~43的跟踪结构都是一个where is the flag,那么我们就进去随便一个看

![[Pasted image 20250406022719.png]]


看一下字节流，有个神奇的lf，无独有偶，下一个流32就有ga，以此类推，就完成了

![[Pasted image 20250406022830.png]]


# 智能合约安全

这部分最后想了想不准备讲了，非常的驳杂繁复，需要对合约深入了解而非区块链结构本身，简单提一下吧

**区块链**本质上是一个去中心化、分布式的账本，具有不可篡改性。这意味着一旦数据被记录到区块链上，就很难被修改或删除。区块链的核心概念包括：
- 交易 transaction
- 区块和链
- 地址 address:用户和合约
- 以太坊：一个允许开发者部署和执行智能合约的环境
- gas:在以太坊上执行交易或智能合约需要消耗计算资源
**智能合约**是部署在区块链上的代码（通常被称为“Code is Law”）它们能够自动执行预先设定的规则，无需人工干预.例如以太坊上最常用的语言是 **Solidity**

一些基础的工具

- remix ide 参与合约开发
- metamask 是一个浏览器插件形式的以太坊钱包，用于管理你的以太坊账户，并与去中心化应用程序（DApps）和智能合约进行交互
- Etherscan（适用于以太坊主网和测试网）允许你查看区块链上的各种信息，包括地址信息、交易记录以及智能合约的源代码（如果合约是开源的）
- **Ganache**:可以帮助你在本地搭建一个私有的以太坊环境进行练习，而无需连接到公共网络.

目前大部分智能合约不是基于区块链本身的攻击，而是Solidity Security

这部分基础知识非常驳杂，一些经典的学习资料和工具

- [智能合约学习](https://github.com/hzysvilla/Academic_Smart_Contract_Papers)
- [solidity可视化](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor)
- [Code coverage for Solidity smart-contracts](https://github.com/sc-forks/solidity-coverage)

目前存在的一些方向：

- 基于Ethereum Opcodes的操作合成，一般是完成任务-获取flag的类型
- 已有攻击类型的复现
	- 智能合约逆向

属于是刚需现场学习查询的一个新兴领域，因为与具体的漏洞有关