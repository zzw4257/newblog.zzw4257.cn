# 隐私计算实验初稿

## 实验报告：案例1 - 金融风险预测 (HE 应用)

**学号-姓名-实验名称**: XXXX-YYYY-金融风险预测

### 一、实验简介

**1. 案例描述**
在蓬勃发展的农村经济背景下，金融服务的普及成为推动农村全面发展的关键力量，小额信贷服务为农村商业和个人带来了新的机遇，但风险控制和信用评估难度增大，制约了金融服务的广泛应用和创新发展。如何在确保隐私保护的条件下，对信贷风险进行准确预测，成为农村经济发展的重要挑战。
本案例基于银行 `bank` 和第三方支付平台 `agency` 之间的合作场景。银行拥有包括弱风险特征和信贷特征在内的数据资源，但样本量较小。支付平台则持有大量的用户数据，包含消费相关特征和丰富的用户交互关系数据。

**2. 任务描述**
使用隐语 SecretNote 平台，基于隐语多方安全计算技术（特别是同态加密 HE），构建一个有效预测金融风险的模型，实现银行 `bank` 与支付平台 `agency` 之间的安全联合建模。数据集包括银行数据 (`bank.csv`) 和第三方支付平台的消费特征及用户交互关系数据 (`behavior.csv`)。

### 二、实验目的

1. 了解多方安全计算（MPC）在金融风险预测中的应用场景。
2. 掌握使用 SecretFlow 平台进行纵向联邦学习的基本流程，特别是涉及同态加密（HE）的配置和使用。
3. 学习在 SecretFlow 中对齐和处理多方数据（Vertical DataFrame - VDF）。
4. 实践特征工程（编码、标准化）在多方安全计算环境下的应用。
5. 构建并训练一个基于 HESS (Homomorphic Encryption based Secure Sharing) 的逻辑回归模型 (`HESSLogisticRegression`)。
6. 评估模型性能，理解在隐私保护前提下联合建模的优势。

### 三、实验环境与配置

1. **实验平台**: 隐语 SecretNote 在线平台。
2. **参与方节点**:
   * 银行: `bank`
   * 第三方支付平台: `agency`
3. **核心库**: `secretflow` (sf), `spu` (Secure Processing Unit)。
4. **Ray-Fed 配置**:
   * 各参与方 (`bank`, `agency`) 在各自的 SecretNote 节点上初始化 Ray-Fed 集群。
   * `cluster_config` 中指定了各方的 IP 地址和监听端口。`self_party` 指明当前初始化脚本所属的参与方。
   * `sf.init(address="127.0.0.1:6379", cluster_config=cluster_config)` 用于启动/连接到 Ray head 节点并建立 Ray-Fed 集群。
5. **SPU (Secure Processing Unit) 配置**:
   * SPU 用于执行多方安全计算协议。
   * `spu_conf` 定义了参与 SPU 计算的节点 (`bank`, `agency`)及其通信地址和端口。
   * 指定了 MPC 协议 (`protocol: spu.spu_pb2.SEMI2K`) 和计算域 (`field: spu.spu_pb2.FM128`)。
   * `sf.SPU(...)` 用于创建 SPU 实例。

### 四、实验步骤与代码解析

**1. 实验环境初始化**

* 获取可用端口：通过 `unused_tcp_port()` 函数为 Ray-Fed 和 SPU 运行时获取未被占用的 TCP 端口。
* Ray-Fed 初始化：
  ```python
  # 银行方执行
  cluster_config_bank = { # ...内含 bank 和 agency 的实际IP和端口 ...
  'self_party': 'bank'
  }
  sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_bank)

    # 支付平台方执行
      cluster_config_agency = { # ...内含 bank 和 agency 的实际IP和端口 ...
          'self_party': 'agency'
      }
      sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_agency)
      ```

  ```
* SPU 初始化：
  ``python spu_conf = { # ...内含 bank 和 agency SPU节点的实际IP和端口 ... "runtime_config": { "protocol": spu.spu_pb2.SEMI2K, "field": spu.spu_pb2.FM128, # ... }, } spu_instance = sf.SPU(cluster_def=spu_conf, ...) ``

**2. 数据集加载与对齐**

* 定义文件路径：获取当前工作目录并构造 `bank.csv` 和 `behavior.csv` 的完整路径。
* 创建 PYU 实例：`bank = sf.PYU("bank")` 和 `agency = sf.PYU("agency")` 代表各方计算设备。
* 加载纵向数据：使用 `read_csv` 将双方数据加载为纵向联邦数据框 (VDataFrame - `vdf`)。
  ``python path_dict = {bank: bank_input_path, agency: agency_input_path} vdf = read_csv(path_dict, spu=spu_instance, keys="id", drop_keys="id") ``
  `keys="id"` 指定了双方数据对齐的键，`drop_keys="id"` 表示对齐后删除该键。`spu` 参数用于后续可能在 SPU 上的操作。

**3. 特征工程**

* **特征编码 (One-Hot Encoding)**：对类别特征 (`term`, `purpose`, `delinquency_2years`, `verificationStatus`, `homeOwnership`, `grade`) 进行独热编码。
  ``python from secretflow.preprocessing.encoder import OneHotEncoder encoder = OneHotEncoder() for col_name in categorical_cols: tranformed_df = encoder.fit_transform(vdf[col_name]) vdf[tranformed_df.columns] = tranformed_df vdf = vdf.drop(columns=categorical_cols) # 删除原始类别列 ``
* **特征标准化 (Standard Scaling)**：对数值型连续特征进行标准化。
  ``python from secretflow.preprocessing import StandardScaler scaler = StandardScaler() numerical_cols = ["loanAmnt", "interestRate", ...] # 列表包含所有数值特征 scalered_vdf = scaler.fit_transform(vdf[numerical_cols]) vdf[scalered_vdf.columns] = scalered_vdf # 更新原vdf # 注意：原脚本中是 vdf[scalered_vdf.columns] = scalered_vdf，这意味着原数值列被标准化后的列替换。 # 如果原列名与标准化后列名相同，则直接更新。如果不同（例如加了后缀），则会添加新列。 # 实际脚本中，StandardScaler通常会保留原列名。 ``

**4. 划分特征与标签**

* 将处理后的 `vdf` 划分为特征集 `X_vdf` 和标签 `y` (即 `isDefault` 列)。
  ``python y = vdf["isDefault"] X_vdf = vdf.drop(columns=["isDefault"]) ``

**5. 同态加密配置与模型训练 (HESS Logistic Regression)**

* **HEU (Homomorphic Encryption Unit) 配置**: 为 `bank` 和 `agency` 分别配置 HEU。HEU 负责同态加密相关的操作。
  * `sk_keeper`: 指定私钥持有方。
  * `evaluators`: 指定可以在密文上进行计算的评估方。
  * `mode`: "PHEU" (Paillier Homomorphic Encryption Unit)。
  * `he_parameters`: 配置同态加密方案 (如 "ou" - Okamoto-Uchiyama) 和密钥大小。
  * `encoding`: 配置明文编码方式，如 `IntegerEncoder`。

  ```python
  heu_config_template = {
  "sk_keeper": {"party": "bank"}, # 示例：bank持有私钥
  "evaluators": [{"party": "agency"}], # 示例：agency是评估方
  "mode": "PHEU",
  "he_parameters": {"schema": "ou", "key_pair": {"generate": {"bit_size": 2048}}},
  }
  # 为bank配置HEU
  config_bank_heu = heu_config_template.copy()
  config_bank_heu['encoding'] = {...}
  heu_bank = sf.HEU(config_bank_heu, spu_instance.cluster_def['runtime_config']['field'])

    # 为agency配置HEU (通常sk_keeper和evaluator的角色会互换或根据具体算法设计)
      # 在HESS LR中，一方（如agency）加密梯度给另一方（bank）聚合
      config_agency_heu = heu_config_template.copy()
      # ... 调整 sk_keeper 和 evaluators for agency ... (脚本中为agency和bank各创建了一个HEU实例，角色有所不同)
      # 脚本中的做法：
      # heu_bank 用于银行侧的操作，heu_agency 用于支付平台侧的操作。
      # HESSLogisticRegression内部会协调使用这两个HEU实例。
      ```

  ```
* **模型训练**: 使用 `HESSLogisticRegression` 进行模型训练。
  ``python from secretflow.ml.linear.hess_sgd import HESSLogisticRegression model = HESSLogisticRegression(spu_instance, heu_agency, heu_bank) # 注意传入了两个HEU实例 model.fit(X_vdf, y, epochs=4, batch_size=5096) ``
  HESS 逻辑回归利用同态加密保护梯度信息，在多方之间安全地进行模型参数更新。

**6. 模型预测与评估**

* **预测**: 使用训练好的模型对特征数据 `X_vdf` 进行预测。
  ``python y_pred_encrypted = model.predict(X_vdf) ``
* **结果揭露**: 使用 `sf.reveal` 将 SPU/HEU 上的密态预测结果和明文标签揭露到本地进行评估。
  ``python y_pred_revealed = sf.reveal(y_pred_encrypted) y_true_revealed = sf.reveal(y.partitions[bank].data) # 假设标签在bank方 ``
* **评估**: 计算 ROC AUC 分数。
  ``python from sklearn.metrics import roc_auc_score auc = roc_auc_score(y_true_revealed, y_pred_revealed) print(f"AUC: {auc}") ``

### 五、实验结果与分析

* 数据集加载后，`vdf.shape` 显示了对齐后的数据维度，例如 (20000, 76)，表示20000个样本，76个特征（包括原始特征和编码后新增的特征，未扣除标签）。
* 特征工程对数据进行了必要的转换，使得原始数据适用于逻辑回归模型。
* `HESSLogisticRegression` 模型成功在加密数据上进行了训练。
* 模型预测得到的 `y_pred` 是概率值。
* 最终计算得到的 AUC 分数（例如，脚本中得到的 `auc` 值为 0.6977...）反映了模型在测试集上的区分正负样本的能力。这个值越高，模型性能越好。对于金融风控模型，AUC 是一个关键的评估指标。

### 六、实验总结

本实验成功演示了如何利用隐语 SecretFlow 框架，通过银行 (`bank`) 与第三方支付平台 (`agency`) 的合作，在确保数据隐私（通过同态加密 HE 和 MPC）的前提下，联合双方数据构建了一个金融风险预测模型。
主要步骤包括：

1. 配置多方计算环境 (Ray-Fed, SPU, HEU)。
2. 安全加载和对齐纵向数据。
3. 在联邦学习框架下进行特征工程。
4. 使用 `HESSLogisticRegression` 进行隐私保护的模型训练。
5. 对模型进行预测和评估。

该实验证明了隐语技术在解决实际金融风控问题中的可行性和有效性，能够在不暴露各方原始数据的情况下，汇聚数据价值，提升模型性能。

### 七、实验代码

```python
# 关键代码片段已在“四、实验步骤与代码解析”中展示。
# 完整代码请参考 case1-金融风险预测.py 文件。
```

---

## 实验报告：案例2 - 黑名单求交 (PSI 应用)

**学号-姓名-实验名称**: XXXX-YYYY-黑名单求交

### 一、实验简介

**1. 案例描述**
随着在线金融服务的兴起，银行和金融机构面临开户欺诈的挑战。开户欺诈表现为个人或团体在申请银行账户时提交虚假信息、伪造或盗窃身份证件等。本案例模拟银行 `bank` 与公安 `police` 的合作，银行提供银行卡数据，公安共享身份证数据，在确保数据隐私的前提下，使用 PSI (Private Set Intersection) 技术找出双方共有的用户（如潜在的欺诈账户）。

**2. 任务描述**
基于银行卡数据 (`payment.csv`) 和公安身份证数据 (`record.csv`)，以 `uid` 作为求交键值，利用隐语 SecretNote 平台的 PSI 技术，计算银行和公安双方数据的交集大小，并输出交集内容给指定方（银行方）。

### 二、实验目的

1. 理解隐私集合求交 (PSI) 的概念及其在数据安全合作中的应用。
2. 掌握使用 SecretFlow 平台配置和执行两方 PSI 任务的流程。
3. 熟悉 `spu.psi` 函数的参数设置，如求交键、输入/输出路径、结果接收方、求交协议等。
4. 学习如何在不泄露非交集数据的前提下，安全地获得两方数据集的共同元素。
5. 验证 PSI 技术的有效性和隐私保护特性。

### 三、实验环境与配置

1. **实验平台**: 隐语 SecretNote 在线平台。
2. **参与方节点**:
   * 银行: `bank`
   * 公安: `police`
3. **核心库**: `secretflow` (sf), `spu` (Secure Processing Unit)。
4. **Ray-Fed 配置**:
   * 各参与方 (`bank`, `police`) 在各自的 SecretNote 节点上初始化 Ray-Fed 集群。
   * `cluster_config` 中指定了各方的 IP 地址和监听端口。
   * `sf.init(...)` 用于启动/连接 Ray-Fed。
5. **SPU (Secure Processing Unit) 配置**:
   * SPU 用于执行 PSI 协议。
   * `spu_conf` 定义了参与 SPU 计算的节点 (`bank`, `police`) 及其通信地址和端口。
   * 指定了 MPC 协议 (如 `SEMI2K`) 和计算域，虽然 PSI 主要依赖特定协议，但 SPU 环境需要建立。
   * `sf.SPU(...)` 用于创建 SPU 实例。

### 四、实验步骤与代码解析

**1. 实验环境初始化**

* 获取可用端口：`unused_tcp_port()` 为 Ray-Fed 和 SPU 获取端口。
* Ray-Fed 初始化：分别为 `bank` 和 `police` 执行 `sf.init`，传入各自的 `cluster_config`。
  ```python
  # 银行方执行
  cluster_config_bank = { "parties": {"bank": {"address": "bank_ip:port", ...}, "police": {...}}, 'self_party': 'bank'}
  sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_bank)

    # 公安方执行
      cluster_config_police = { "parties": {"bank": {...}, "police": {"address": "police_ip:port", ...}}, 'self_party': 'police'}
      sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_police)
      ```

  ```
* SPU 初始化：
  ``python spu_conf = { "nodes": [{"party": "bank", "address": "bank_spu_ip:port"}, {"party": "police", "address": "police_spu_ip:port"}], "runtime_config": {"protocol": spu.spu_pb2.SEMI2K, "field": spu.spu_pb2.FM128, ...}, } spu_instance = sf.SPU(cluster_def=spu_conf, ...) ``

**2. PSI 任务配置与执行**

* **定义文件路径**：
  ``python current_dir = os.getcwd() bank_input = f"{current_dir}/payment.csv" police_input = f"{current_dir}/record.csv" bank_output = f"{current_dir}/payment_intersect.csv" police_output = f"{current_dir}/payment_intersect.csv" # 注意：公安方也会指定输出路径，但根据broadcast_result可能为空或不含真实交集 ``
* **执行 PSI 任务**：调用 `spu.psi()` 函数。
  ``python spu_instance.psi( keys={"bank": ["uid"], "police": ["uid"]},  # 指定双方求交的列名 input_path={"bank": bank_input, "police": police_input}, # 各方输入文件 output_path={"bank": bank_output, "police": police_output}, # 各方输出文件 receiver="bank",  # 指定结果接收方为银行 broadcast_result=False, # 结果不广播给所有参与方，仅接收方获得真实交集 protocol="PROTOCOL_ECDH", # 使用ECDH PSI协议 ecdh_curve="CURVE_25519" # ECDH协议使用的椭圆曲线 ) ``
  * `keys`: 定义了双方数据集中用于求交的列。
  * `receiver`: 指定哪一方接收最终的交集结果。
  * `broadcast_result=False`: 意味着只有 `receiver` (即 `bank`) 能得到真实的交集数据。其他方（`police`）的输出文件可能为空，或者只包含其原始数据中属于交集的部分（取决于具体PSI协议实现和参数），但不会得到对方的非交集信息。脚本中公安方的 `intersection_count`为-1，表明其未收到真实交集信息。
  * `protocol="PROTOCOL_ECDH"`: 指定使用基于椭圆曲线迪菲-赫尔曼密钥交换的 PSI 协议，这是一种常见的安全两方 PSI 协议。

**3. 查看 PSI 结果**

* PSI 任务执行完成后，`bank` 方的 `payment_intersect.csv` 文件将包含交集数据。
* 可以通过 `pandas` 读取并查看交集内容（仅在 `bank` 节点操作时能看到真实数据）。
  ``python # 仅在 bank 节点执行时能看到真实交集 import pandas as pd intersect_data = pd.read_csv(bank_output) print(intersect_data.head()) ``
* 执行 `spu.psi` 时，控制台会输出求交统计信息，如 `[{'party': 'bank', 'original_count': 1000000, 'intersection_count': 800000}, {'party': 'police', 'original_count': 1000000, 'intersection_count': -1}]`。这表明银行方原始数据100万条，交集80万条；公安方原始数据100万条，但由于 `broadcast_result=False` 且其非接收方，其交集计数显示为-1。

### 五、实验结果与分析

* PSI 任务成功执行，银行方 (`bank`) 获得了与公安方 (`police`) 数据的交集。
* 交集大小为800,000条记录，这表示有80万个 `uid` 同时存在于银行和公安的数据集中。
* 银行方在其输出文件 `payment_intersect.csv` 中得到了这些交集记录的详细信息（通常是其原始数据中属于交集的部分）。
* 公安方由于 `broadcast_result=False` 的设置，并未获得真实的交集内容，其 `intersection_count` 为-1，确保了数据的单向披露（仅银行方获得结果）。
* 整个求交过程保护了双方非交集数据的隐私，公安方不知道银行的哪些用户不在其记录中，反之亦然。

### 六、实验总结

本实验成功演示了如何使用隐语 SecretFlow 的 PSI 功能，在银行和公安两方之间安全地进行黑名单（或共同用户）求交。
通过配置 `spu.psi`，指定了求交键、数据源、结果输出路径、结果接收方以及具体的 PSI 协议 (ECDH)。实验结果表明，PSI 技术能够在不泄露各方私有数据的前提下，有效地找出双方的共同数据子集，为金融反欺诈等协作场景提供了强大的隐私保护计算工具。`broadcast_result=False` 参数的运用也展示了如何控制结果的可见性。

### 七、实验代码

```python
# 关键代码片段已在“四、实验步骤与代码解析”中展示。
# 完整代码请参考 case2-黑名单求交.py 文件。
```

---

## 实验报告：案例3 - PIR 专利域名申请 (PIR 应用)

**学号-姓名-实验名称**: XXXX-YYYY-PIR专利域名申请

### 一、实验简介

**1. 案例描述**
在域名、专利的申请过程中，用户（专利申请方 `applicant`）需要向相关数据库（服务提供方 `server`）查询其拟申请的域名或专利信息是否已存在。然而，申请方不希望服务提供方知晓其查询的具体名称，以防被抢先注册。私有信息检索 (PIR) 技术可以解决此类问题。

**2. 任务描述**
利用隐语 SecretNote 平台和 PIR 技术，从服务提供方 `server` 已预处理好的数据库 (`pir_server_setup` 目录中的内容，由原始专利数据生成) 中，查询专利申请方 `applicant` 提供的查询列表 (`pir_query.csv`) 中的专利信息。核心要求是确保在查询过程中，`server` 无法获知 `applicant` 查询的具体专利名称。
注意：`server_secret_key.bin` 文件（PIR 服务端密钥的一部分）需要放置在 `server` 容器的 `/tmp` 目录下。

### 二、实验目的

1. 理解私有信息检索 (PIR) 的概念及其在保护查询隐私方面的应用。
2. 掌握使用 SecretFlow 平台配置和执行两方 PIR 查询任务的流程。
3. 熟悉 `spu.pir_query` 函数的参数设置，包括服务端、客户端、服务端预处理数据路径、客户端查询键、查询文件路径和结果输出路径。
4. 学习 PIR 技术如何允许客户端从服务端检索信息，而不向服务端暴露其具体查询项。
5. 了解 PIR 服务端预处理（`pir_setup`，本实验中已提供结果）和服务端密钥管理的重要性。

### 三、实验环境与配置

1. **实验平台**: 隐语 SecretNote 在线平台。
2. **参与方节点**:
   * 专利申请方 (客户端): `applicant`
   * 服务提供方 (数据源方): `server`
3. **核心库**: `secretflow` (sf), `spu` (Secure Processing Unit)。
4. **Ray-Fed 配置**:
   * 各参与方 (`applicant`, `server`) 在各自的 SecretNote 节点上初始化 Ray-Fed 集群。
   * `cluster_config` 中指定了各方的 IP 地址和监听端口。
   * `sf.init(...)` 用于启动/连接 Ray-Fed。
5. **SPU (Secure Processing Unit) 配置**:
   * SPU 用于支持 PIR 协议的某些计算（尽管 PIR 核心逻辑可能不完全依赖通用 MPC 协议）。
   * `spu_conf` 定义了参与 SPU 计算的节点 (`applicant`, `server`) 及其通信地址和端口。
   * `sf.SPU(...)` 用于创建 SPU 实例。

### 四、实验步骤与代码解析

**1. 实验环境初始化**

* 获取可用端口：`unused_tcp_port()` 为 Ray-Fed 和 SPU 获取端口。
* Ray-Fed 初始化：分别为 `applicant` 和 `server` 执行 `sf.init`。
  ```python
  # 申请方执行
  cluster_config_applicant = { # ...内含 applicant 和 server 的实际IP和端口 ...
  'self_party': 'applicant'
  }
  sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_applicant)

    # 服务方执行
      cluster_config_server = { # ...内含 applicant 和 server 的实际IP和端口 ...
          'self_party': 'server'
      }
      sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_server)
      ```

  ```
* SPU 初始化：
  ``python spu_conf = { # ...内含 applicant 和 server SPU节点的实际IP和端口 ... } spu_instance = sf.SPU(cluster_def=spu_conf, ...) ``

**2. 服务端数据与密钥准备 (Server-Side)**

* **解压预处理数据**: 服务端拥有一个预处理后的数据库。在本实验中，这是 `pir_server_setup.tar`。
  ``bash !tar -xvf pir_server_setup.tar # 在 server 节点执行 ``
  这会解压出 `pir_server_setup` 目录，其中包含 PIR 服务端所需的数据结构。
* **移动密钥文件**: PIR 服务端需要一个密钥文件 (`server_secret_key.bin`)，该文件也从 `pir_server_setup.tar` 中解压得到，需要将其移动到 `server` 容器的 `/tmp` 目录下。这是PIR库约定的密钥位置。
  ``bash mv server_secret_key.bin /tmp # 在 server 节点执行 ``
  *注：`pir_setup` (未在本次实验中执行，但属于PIR流程) 是一个预处理步骤，服务端用它来处理原始数据库并生成 `pir_server_setup` 目录和 `server_secret_key.bin`。客户端通常会得到一个公钥（如果PIR方案需要）。*

**3. 执行 PIR 查询 (Client-Side发起, Server-Side参与)**

* **定义文件路径和参数**：
  ``python current_dir = os.getcwd() # 在 applicant 节点获取路径 # server_setup_path 指向 server 节点上解压后的数据目录 # client_input_path 指向 applicant 节点上的查询文件 # client_output_path 指向 applicant 节点上将保存结果的文件 ``
* **执行 PIR 查询**: 调用 `spu.pir_query()` 函数。此函数由申请方 (`applicant`) 逻辑上发起，服务方 (`server`) 协同完成。
  ``python spu_instance.pir_query( server='server',  # 指定服务提供方的 party name client='applicant', # 指定专利申请方的 party name server_setup_path=f'{current_dir}/pir_server_setup', # Server上预处理数据的路径 (注意：这里current_dir应为server节点的路径) # 实践中，server_setup_path应直接指向server上的绝对或相对路径 client_key_columns="uid", # 客户端查询文件中用作查询键的列名 client_input_path=f"{current_dir}/pir_query.csv", # Applicant的查询文件路径 client_output_path=f"{current_dir}/pir_result.csv" # Applicant的结果输出路径 ) ``
  * `server_setup_path`: 必须是 `server` 节点可以访问的路径，指向PIR预处理数据的根目录。
  * `client_input_path`: `applicant` 节点上的 CSV 文件，包含要查询的 `uid`。
  * `client_output_path`: `applicant` 节点上将保存查询结果的 CSV 文件。如果查询的 `uid` 在服务端数据库中存在，则返回对应的整行数据。

### 五、实验结果与分析

* 服务端准备：`pir_server_setup.tar` 成功解压，`server_secret_key.bin` 被移动到 `/tmp` 目录。
* PIR 查询执行：`spu.pir_query` 函数执行后，`applicant` 方会生成 `pir_result.csv` 文件。
* 输出日志（示例）：`[{'party': 'server', 'data_count': 1}, {'party': 'applicant', 'data_count': 1}]`
  * 这表示 `server` 处理了对应1条（或若干条，取决于PIR方案和查询批次）可能的查询（但不知道具体是哪条）。
  * `applicant` 成功查询到了1条匹配的记录。
* `pir_result.csv` 内容：该文件包含 `pir_query.csv` 中存在于服务端数据库的那些 `uid` 及其对应的完整专利信息（从服务端数据库中检索得到）。如果查询的 `uid` 不在服务端，则结果文件中不会有该条记录。
* 隐私保护：在整个查询过程中，`server` 仅知道 `applicant` 进行了一次查询操作，但无法得知 `applicant` 查询的具体 `uid` 是什么，从而保护了查询内容的隐私。

### 六、实验总结

本实验成功演示了隐语 SecretFlow 的 PIR（私有信息检索）功能。通过 `spu.pir_query`，专利申请方 (`applicant`) 能够向服务提供方 (`server`) 查询专利信息，而服务方无法获知查询的具体内容。
这依赖于服务端的预处理 (`pir_setup` 阶段，本实验使用其产物）和密钥管理。PIR 技术有效地解决了用户在查询敏感信息时对查询隐私的顾虑，在专利查询、数据库检索等场景具有重要应用价值。

### 七、实验代码

```python
# 关键代码片段已在“四、实验步骤与代码解析”中展示。
# 完整代码请参考 case3-PIR专利.py 文件。
```

---

## 实验报告：案例4 - 诈骗电话识别 (纵向联邦 XGBoost 应用)

**学号-姓名-实验名称**: XXXX-YYYY-诈骗电话识别

### 一、实验简介

**1. 案例描述**
某地运营商 A 与运营商 B 希望联合建模，基于双方各自持有的用户个人基本信息、套餐使用信息、上网流量、通话信息等特征数据，以实现更精准的诈骗电话检测与识别。运营商 A 提供部分特征及标签数据，运营商 B 提供其余特征数据。这是一个典型的纵向联邦学习场景。

**2. 任务描述**
采用两方（运营商 A - `alice`，运营商 B - `bob`）纵向联邦学习的方式，基于融合双方特征的数据集训练一个联合模型（SS-XGBoost）。核心要求是确保各方的原始数据不泄露给对方，中间计算结果也受到保护。

### 二、实验目的

1. 理解纵向联邦学习的概念及其在多方数据不出域前提下联合建模的应用。
2. 掌握使用 SecretFlow 平台配置和执行纵向联邦学习任务（特别是 SS-XGBoost）的流程。
3. 学习在 SecretFlow 中加载和处理纵向联邦数据集 (VDataFrame)。
4. 实践在纵向联邦场景下进行特征工程，如特征删除、缺失值填充。
5. 构建并训练一个基于安全共享的 XGBoost 模型 (`secretflow.ml.boost.ss_xgb_v.Xgb`)。
6. 了解纵向联邦 XGBoost 模型训练过程中的隐私保护机制。

### 三、实验环境与配置

1. **实验平台**: 隐语 SecretNote 在线平台。
2. **参与方节点**:
   * 运营商 A: `alice` (持有部分特征和标签)
   * 运营商 B: `bob` (持有其余特征)
3. **核心库**: `secretflow` (sf), `spu` (Secure Processing Unit)。
4. **Ray-Fed 配置**:
   * 各参与方 (`alice`, `bob`) 在各自的 SecretNote 节点上初始化 Ray-Fed 集群。
   * `cluster_config` 中指定了各方的 IP 地址和监听端口。
   * `sf.init(...)` 用于启动/连接 Ray-Fed。
5. **SPU (Secure Processing Unit) 配置**:
   * SPU 用于执行纵向联邦 XGBoost 中的安全计算部分（如梯度聚合、分裂点寻找等）。
   * `spu_conf` 定义了参与 SPU 计算的节点 (`alice`, `bob`) 及其通信地址和端口。
   * `sf.SPU(...)` 用于创建 SPU 实例。
6. **PYU (Python Unit) 实例**:
   * `alice_pyu = sf.PYU("alice")` 和 `bob_pyu = sf.PYU("bob")` 代表各方的本地计算环境。

### 四、实验步骤与代码解析

**1. 实验环境初始化**

* 获取可用端口：`unused_tcp_port()`。
* Ray-Fed 初始化：分别为 `alice` 和 `bob` 执行 `sf.init`。
* SPU 初始化。
* 创建 PYU 实例：`alice, bob = sf.PYU("alice"), sf.PYU("bob")`。

**2. 加载纵向联邦数据集**

* **定义文件路径**：
  ``python current_dir = os.getcwd() # 训练集路径 alice_train_input = f"{current_dir}/train_a_label.csv" # Alice 有标签 bob_train_input = f"{current_dir}/train_b.csv" # 测试集路径 (脚本中，测试集 alice 方不含标签，这通常用于盲测) alice_test_input = f"{current_dir}/test_a.csv" bob_test_input = f"{current_dir}/test_b.csv" ``
* **加载训练集和测试集为 VDataFrame**：
  ```python
  from secretflow.data.vertical import read_csv
  train_path_dict = {alice: alice_train_input, bob: bob_train_input}
  vdf_train_raw = read_csv(train_path_dict) # 默认按样本顺序对齐，或需要指定对齐键

    test_path_dict = {alice: alice_test_input, bob: bob_test_input}
      vdf_test_raw = read_csv(test_path_dict)
      ```*注：`read_csv` 在纵向场景下，如果未提供 `keys` 参数，它会假设数据已按行对齐。在实际应用中，通常需要一个共享的 ID 列进行对齐。本案例中数据已预对齐。*

  ```

**3. 数据集划分**

* 将原始训练集 `vdf_train_raw` 进一步划分为新的训练集 `vdf_train` 和验证集 `valid_vdf`。
  ``python from secretflow.data.split import train_test_split vdf_train, valid_vdf = train_test_split(vdf_train_raw, train_size=0.4, random_state=0) ``

**4. 特征工程**

* **删除部分特征**: 基于缺失率（如超过65%）或业务判断（无用特征）删除列。
  ``python drop_col_list = ["vip_lvl", "cmcc_pub_tl_typ_code", ...] # 定义要删除的列名 vdf_train_dropped = vdf_train.drop(columns=drop_col_list) # 对 valid_vdf 和 vdf_test_raw 也应做同样处理（未在脚本中明确显示对后两者的处理，但实际应做） ``
* **缺失值填充**:

  * 识别含缺失值的列：`na_count = vdf_train_dropped.isna().sum()`
  * 计算众数：`na_mode = vdf_train_dropped[na_cols].mode()`
  * 用众数填充：

  ```python
  fill_value_dict = {col: na_mode[col].values[0] for col in na_cols} # 构建填充字典
                                                                # na_mode[col]可能返回多个众数，取第一个
  vdf_train_filled = vdf_train_dropped.fillna(fill_value_dict)
  # 对 valid_vdf 和 vdf_test_raw 也应使用训练集计算的众数进行填充
  ```

  *注意：脚本中 `na_mode[col]` 直接赋值，如果 `na_mode[col]` 是一个 Series (比如多个众数或一个元素的Series)，直接赋值给 `fillna` 的字典值可能需要调整为标量，如 `na_mode[col].iloc[0]`。实际代码中 `na_mode[col]` 可能会被隐式转换为可接受的格式。*

**5. 纵向 XGBoost 建模 (SS-XGB)**

* **准备训练数据**: 从填充后的训练集 `vdf_train_filled` 中分离特征 `train_x` 和标签 `train_y`。
  ``python train_x = vdf_train_filled.drop(columns=['label']) train_y = vdf_train_filled['label'] # 标签在 alice 方 ``
* **配置模型参数**:
  ``python from secretflow.ml.boost.ss_xgb_v import Xgb xgb_model_trainer = Xgb(spu_instance) # 传入 SPU 实例 params = { 'num_boost_round': 3, 'max_depth': 3, 'sketch_eps': 0.25, 'objective': 'logistic', 'reg_lambda': 0.2, 'subsample': 0.1, 'colsample_by_tree': 0.1, 'base_score': 0.5, } ``
* **模型训练**:
  ``python xgb_model = xgb_model_trainer.train(params=params, dtrain=train_x, label=train_y) ``
  `Xgb.train` 方法会执行纵向联邦 XGBoost 的训练流程。在这个过程中：
  * 持有标签方 (`alice`) 计算梯度和 Hessian 矩阵。
  * 各方基于本地特征寻找最佳分裂点，并通过安全多方计算（在 SPU 上）确定全局最佳分裂点，而不暴露各方的具体特征值或梯度。
  * 模型参数（树结构）在各方间安全地构建。

* [ ] 五、实验结果与分析

* 数据集成功加载和预处理，包括特征删除和缺失值填充。
* 纵向 XGBoost 模型 (`xgb_model`) 成功在运营商 A 和 B 的联合数据上完成训练。
* 脚本输出了训练过程中的一些信息，例如 `vdf_train_filled.shape` 显示了预处理后训练集的大小。
* 由于脚本未包含模型预测和评估步骤（如在验证集 `valid_vdf` 或测试集 `vdf_test_raw` 上进行评估），最终模型的性能未直接展示。在实际应用中，会接着使用 `xgb_model.predict()` 进行预测，并用 `roc_auc_score` 等指标评估模型效果。
* 训练过程本身是隐私保护的，双方的原始特征数据和标签数据均保留在本地，交互的信息是经过加密或安全混淆的中间统计量。

### 六、实验总结

本实验成功演示了如何使用隐语 SecretFlow 框架，通过纵向联邦学习的方式，联合运营商 A (`alice`) 和运营商 B (`bob`) 的数据训练一个诈骗电话识别模型（SS-XGBoost）。
关键步骤包括：

1. 配置多方计算环境 (Ray-Fed, SPU)。
2. 加载和对齐纵向联邦数据。
3. 在联邦设置下进行特征工程。
4. 使用 `secretflow.ml.boost.ss_xgb_v.Xgb` 进行安全的模型训练。

该实验展示了纵向联邦学习在保护各参与方数据隐私的同时，能够有效利用多方数据进行联合建模，从而提升模型性能的潜力。这对于数据孤岛问题提供了一个可行的解决方案。

### 七、实验代码

```python
# 关键代码片段已在“四、实验步骤与代码解析”中展示。
# 完整代码请参考 case4-诈骗电话识别.py 文件。
```

# 案例一：更具体的事件
好的，我们来一起重写“金融风险预测”这个案例。我将采用更结构化的方式，将配置、工具函数、核心逻辑分得更清晰，并加入一些关于API选择的思考过程。每个代码块我会注明建议由哪个参与方（或双方）执行。

**核心重构思路：**

1.  **配置集中化**：将所有重要的配置参数（如文件路径、列名、模型超参数）放在Notebook的开头，方便修改和管理。
2.  **代码块功能单一化**：尽量让每个代码块专注于一个明确的任务。
3.  **API使用说明**：在调用SecretFlow的关键API前，简要说明其作用和为什么选择它。
4.  **注释优化**：提供更精辟的中文注释，特别是针对关键步骤。
5.  **流程引导**：以“思考” -> “实现” -> “说明”的模式推进。

---

### 案例1（重构版）：基于隐语的金融风险联合预测（HE应用）

**实验背景：**
在蓬勃发展的农村经济背景下，金融服务的普及成为推动农村全面发展的关键力量，小额信贷服务为农村商业和个人带来了新的机遇，但风险控制和信用评估难度增大，制约了金融服务的广泛应用和创新发展。如何在确保隐私保护的条件下，对信贷风险进行准确预测，成为农村经济发展的重要挑战。
本案例基于银行 `bank` 和第三方支付平台 `agency` 之间的合作场景。银行拥有包括弱风险特征和信贷特征在内的数据资源（如贷款金额、利率、信用等级），但样本量可能有限。支付平台则持有大量的用户数据，包含消费相关特征和丰富的用户交互关系数据（如消费行为n0-n14等），这些数据对风险评估非常有价值。

**实验目的**：

1.  了解多方安全计算（MPC）在金融风险预测中的应用场景，特别是数据不出本地的联合建模。
2.  掌握使用 SecretFlow 平台进行纵向联邦学习的基本流程，重点是同态加密（HE）的配置 (`sf.HEU`) 和在模型中的应用。
3.  学习在 SecretFlow 中加载 (`secretflow.data.vertical.read_csv`) 和处理多方纵向数据（VDataFrame）。
4.  实践特征工程（如独热编码 `secretflow.preprocessing.encoder.OneHotEncoder`、标准化 `secretflow.preprocessing.StandardScaler`）在多方安全计算环境下的实现。
5.  构建并训练一个基于 HESS (Homomorphic Encryption based Secure Sharing) 的逻辑回归模型 (`secretflow.ml.linear.hess_sgd.HESSLogisticRegression`)，理解其隐私保护机制。
6.  评估模型性能 (`sklearn.metrics.roc_auc_score`)，并通过 `sf.reveal` 安全地获取评估所需数据，理解在隐私保护前提下联合建模的价值。

**实验设计思路与核心API分析：**

本次实验的核心目标是在银行（`bank`）和支付平台（`agency`）之间进行安全的纵向联邦建模。数据特征垂直分布在两方，银行方持有标签。我们将采用HESS逻辑回归模型，该模型利用同态加密（HE）和安全多方计算（MPC）技术，在训练过程中保护各方的梯度和中间计算结果的隐私。

1.  **环境初始化 (`sf.init`, `sf.SPU`)**:
    *   首先，需要初始化Ray Fed集群，使得`bank`和`agency`两个参与方可以通信。`sf.init`函数用于此目的，需要配置各方的网络地址。
    *   接着，初始化SPU（Secure Processing Unit）设备。SPU是执行秘密共享等MPC协议的后端。`sf.SPU`用于创建SPU实例，需要定义参与节点和MPC协议（如SEMI2K）。

2.  **数据加载与对齐 (`sf.PYU`, `secretflow.data.vertical.read_csv`)**:
    *   为每个参与方创建PYU（Python Unit）实例 (`sf.PYU`)，代表其本地计算环境。
    *   使用`secretflow.data.vertical.read_csv`加载双方的CSV数据。此函数会根据指定的对齐键（如用户ID `ID_COLUMN`）将数据对齐，形成一个逻辑上的垂直数据表（VDataFrame, `vdf`）。对齐键在对齐后通常会被移除。

3.  **特征工程 (`OneHotEncoder`, `StandardScaler`)**:
    *   **独热编码**: 对于类别特征（如`term`, `purpose`等），使用`secretflow.preprocessing.encoder.OneHotEncoder`。该编码器作用于VDataFrame，对指定列进行独热编码，生成的新特征列会被添加回VDataFrame，原始列被删除。
    *   **特征标准化**: 对于数值型连续特征（如`loanAmnt`, `interestRate`等），使用`secretflow.preprocessing.StandardScaler`。它将特征数据转换为均值为0、标准差为1的分布，有助于模型收敛和性能提升。同样作用于VDataFrame。

4.  **特征与标签划分**:
    *   从处理后的VDataFrame中分离出特征集 `X_features` (VDataFrame) 和标签 `y_label` (VDataFrame Partition，数据在银行方)。

5.  **同态加密配置 (`sf.HEU`)**:
    *   HESS逻辑回归依赖HE。需要为参与计算的各方配置HEU（Homomorphic Encryption Unit）。`sf.HEU`用于创建HEU实例。
    *   配置中需指定HE方案（如Paillier的变体`ou`）、密钥长度、私钥持有方 (`sk_keeper`) 和评估方 (`evaluators`)，以及明文编码方式。HESS模型会用到双方配置的HEU实例来协调加密计算。

6.  **模型训练 (`HESSLogisticRegression.fit`)**:
    *   实例化`secretflow.ml.linear.hess_sgd.HESSLogisticRegression`模型。构造时需要传入SPU实例和双方的HEU实例。
    *   调用模型的`fit`方法，传入特征集`X_features`和标签`y_label`进行训练。训练过程通过HE和MPC保护梯度等敏感信息。

7.  **模型预测 (`HESSLogisticRegression.predict`)**:
    *   使用训练好的模型对特征集进行预测。`predict`方法返回的是安全对象（如SPUObject或HEUObject），包含加密或秘密共享的预测概率。

8.  **结果揭露与评估 (`sf.reveal`, `roc_auc_score`)**:
    *   为了计算如AUC这样的评估指标，需要将安全的预测结果和真实的标签（如果也是安全对象）转换为明文。`sf.reveal()`函数用于此目的，它会将安全对象的内容揭露给指定的PYU（通常是持有标签方或进行评估的一方）。
    *   在揭露后的明文数据上，使用`sklearn.metrics.roc_auc_score`计算AUC值。
整个流程体现了在保护数据隐私的前提下，如何利用多方数据进行联合建模，从而提升模型效果。
#### 单元格 1: 环境准备与导入库
**执行方**: 银行 `bank`, 支付平台 `agency` (双方都需要执行此单元格以加载必要的库)

**思考**:
开始任何项目前，我们都需要导入所需的库。对于这个隐语项目，核心库是 `secretflow` (简写为 `sf`)。`spu` 是用于安全多方计算的组件。标准库如 `os` 用于路径操作，`socket`, `contextlib`, `typing` 用于网络端口工具函数。

```python
# 基础与隐语核心库
import secretflow as sf
import spu
import os

# 网络工具，用于获取可用端口
import socket
from contextlib import closing
from typing import cast

# 数据处理与模型评估 (这些库通常在数据揭秘后，在某一方本地使用)
import pandas as pd # 用于后续可能在bank方查看部分揭秘数据
from sklearn.metrics import roc_auc_score

print(f"SecretFlow版本: {sf.__version__}")
print(f"SPU版本: {spu.__version__}")
```
**说明**:
此单元格导入了项目所需的所有基本库。打印版本号有助于环境校验和问题追溯。

---
#### 单元格 2: 全局配置与常量定义
**执行方**: 银行 `bank`, 支付平台 `agency` (双方应保持这些配置一致，特别是参与方名称和关键列名)

**思考**:
将所有可配置的参数和常量集中放置，可以提高代码的可读性和可维护性。当需要调整实验参数或在不同环境运行时，只需修改这一部分。

```python
# 参与方定义
BANK_PARTY_NAME = 'bank'
AGENCY_PARTY_NAME = 'agency'

# 数据文件路径 (假设数据文件与Notebook在同一目录下，或根据实际情况修改)
# 这些路径是各参与方节点的本地路径
CURRENT_DIR = os.getcwd() # 各自获取自己的当前工作目录
BANK_DATA_FILE = os.path.join(CURRENT_DIR, 'bank.csv')
AGENCY_DATA_FILE = os.path.join(CURRENT_DIR, 'behavior.csv')

# 数据对齐键和标签列
ID_COLUMN = 'id'
LABEL_COLUMN = 'isDefault' # 标签列，由银行方持有

# 特征工程相关列名
# 需要进行独热编码的类别特征列
CATEGORICAL_COLS_OHE = [
    'term', 'purpose', 'delinquency_2years',
    'verificationStatus', 'homeOwnership', 'grade'
]
# 需要进行标准化的数值特征列
NUMERICAL_COLS_SCALE = [
    "loanAmnt", "interestRate", "installment", "employmentTitle", "annualIncome",
    "dti", "openAcc", "revolBal", "revolUtil", "totalAcc", "n0", "n1", "n2",
    "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11", "n12", "n13", "n14"
]

# HESS逻辑回归模型参数
HESS_EPOCHS = 4
HESS_BATCH_SIZE = 5096 # 根据数据集大小和内存情况调整
```
**说明**:
定义了参与方名称、数据文件路径、关键列名以及模型超参数。这样使得后续代码更清晰，配置修改也更方便。

---
#### 单元格 3: 工具函数 - 获取可用TCP端口
**执行方**: 银行 `bank`, 支付平台 `agency` (双方都需要此函数来为Ray Fed和SPU分配端口)

**思考**:
在多方安全计算中，各参与方需要通过网络通信。为了避免端口冲突，我们需要一个可靠的方法来查找当前未被占用的TCP端口。这个函数通过尝试绑定一个端口然后立即释放它来探测可用端口。

```python
def unused_tcp_port() -> int:
    """返回一个未被使用的TCP端口。

    Returns:
        int: 未被使用的端口号。
    """
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return cast(int, sock.getsockname()[1])

# 测试一下函数
print(f"获取到的一个可用端口: {unused_tcp_port()}")
```
**说明**:
`unused_tcp_port` 函数对于动态配置网络服务非常有用，确保了每次实验运行时都能找到可用的端口。

---
#### 单元格 4: SecretFlow 集群初始化 (Ray Fed)
**执行方**:
1.  **银行 `bank` 单独执行** (修改 `self_party` 为 `BANK_PARTY_NAME`，并填入正确的IP和端口)
2.  **支付平台 `agency` 单独执行** (修改 `self_party` 为 `AGENCY_PARTY_NAME`，并填入正确的IP和端口)

**思考**:
`sf.init` 是启动隐语联邦学习环境的第一步。它初始化了Ray Fed集群，使得不同参与方之间可以进行通信和任务调度。
`cluster_config` 是核心配置，定义了集群中的所有参与方及其网络地址。`self_party` 指明当前执行脚本的节点是哪一方。
`listen_addr` 通常设置为 `0.0.0.0` 加上端口，表示监听所有网络接口的指定端口。`address` 是其他方连接此节点的地址。

**注意**: 下面的IP地址和端口号是示例，你需要根据SecretNote平台实际分配的IP和使用 `unused_tcp_port()` 获取的端口进行替换。

```python
# 为银行方和支付平台方分别生成端口
# 这个步骤理论上应该在各自的节点上分别获取，然后汇总到cluster_config中
# 这里为了演示，我们假设已经获取完毕
# 假设 bank_ray_port = unused_tcp_port() 在 bank 节点运行得到
# 假设 agency_ray_port = unused_tcp_port() 在 agency 节点运行得到
# 例如: bank_ray_port = 58811, agency_ray_port = 41279 (使用原案例中的示例值)

# !!! 请银行方替换 IP 和 PORT !!!
# BANK_ACTUAL_IP = "172.16.0.2" # 银行节点的实际IP
# BANK_RAY_PORT = 58811      # 银行节点 Ray Fed 使用的端口 (通过 unused_tcp_port() 获取)

# !!! 请支付平台方替换 IP 和 PORT !!!
# AGENCY_ACTUAL_IP = "172.16.0.4" # 支付平台节点的实际IP
# AGENCY_RAY_PORT = 41279     # 支付平台节点 Ray Fed 使用的端口 (通过 unused_tcp_port() 获取)

# 下面的配置需要各方根据实际情况修改并执行

# --------- 银行 bank 节点执行此部分 -----------
# current_party_for_init = BANK_PARTY_NAME
# bank_actual_ip = "172.16.0.2" # 银行实际IP
# bank_ray_port = 58811       # 银行Ray端口
# agency_actual_ip = "172.16.0.4" # 支付平台实际IP (银行方需要知道)
# agency_ray_port = 41279       # 支付平台Ray端口 (银行方需要知道)
# --------------------------------------------

# --------- 支付平台 agency 节点执行此部分 -----
current_party_for_init = AGENCY_PARTY_NAME
bank_actual_ip = "172.16.0.2" # 银行实际IP (支付平台方需要知道)
bank_ray_port = 58811       # 银行Ray端口 (支付平台方需要知道)
agency_actual_ip = "172.16.0.4" # 支付平台实际IP
agency_ray_port = 41279       # 支付平台Ray端口
# --------------------------------------------


# 构造 cluster_config
cluster_config_fed = {
    'parties': {
        BANK_PARTY_NAME: {
            'address': f'{bank_actual_ip}:{bank_ray_port}',
            'listen_addr': f'0.0.0.0:{bank_ray_port}'
        },
        AGENCY_PARTY_NAME: {
            'address': f'{agency_actual_ip}:{agency_ray_port}',
            'listen_addr': f'0.0.0.0:{agency_ray_port}'
        },
    },
    'self_party': current_party_for_init
}

# 初始化 SecretFlow, address 通常指向本地Ray head节点
# 在SecretNote中，Ray head通常在 '127.0.0.1:6379'
if sf.is_initialized():
    sf.shutdown()
sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_fed, logging_level='INFO')

print(f"节点 {current_party_for_init} Ray Fed 初始化成功!")
```
**说明**:
此单元格完成了Ray Fed集群的初始化。**极其重要**的是，`cluster_config_fed` 中的IP地址和端口必须是各参与方实际可达的网络地址和未被占用的端口。`self_party`的正确设置确保了每个节点知道自己在集群中的身份。`sf.shutdown()` 后再 `sf.init()` 确保环境干净。

---
#### 单元格 5: SPU (Secure Processing Unit) 初始化
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行，配置需一致)

**思考**:
SPU是隐语中执行安全多方计算（如SEMI2K协议）的后端引擎。它需要独立于Ray Fed的网络端口进行通信。
`sf.SPU()` 用于创建SPU设备。`cluster_def` 定义了参与SPU计算的所有节点及其SPU服务地址。
`protocol` 和 `field` 分别指定了MPC协议类型（如半诚实两方SEMI2K）和计算的有限域。

**注意**: SPU端口也需要通过 `unused_tcp_port()` 获取，并确保各方配置一致。

```python
# 假设 bank_spu_port = unused_tcp_port() 在 bank 节点运行得到
# 假设 agency_spu_port = unused_tcp_port() 在 agency 节点运行得到
# 例如: bank_spu_port = 45563, agency_spu_port = 48221 (使用原案例中的示例值)

# !!! 各方需确认SPU IP与上面Ray Fed的IP一致，端口通过 unused_tcp_port() 新获取 !!!
# BANK_SPU_PORT = 45563
# AGENCY_SPU_PORT = 48221

spu_cluster_config = {
    'nodes': [
        {'party': BANK_PARTY_NAME, 'address': f'{bank_actual_ip}:{BANK_SPU_PORT}'}, # 使用上方定义的bank_actual_ip
        {'party': AGENCY_PARTY_NAME, 'address': f'{agency_actual_ip}:{AGENCY_SPU_PORT}'}, # 使用上方定义的agency_actual_ip
    ],
    'runtime_config': {
        'protocol': spu.spu_pb2.SEMI2K, # 半诚实两方计算协议
        'field': spu.spu_pb2.FM128,     # 128位定点数域
        'sigmoid_mode': spu.spu_pb2.RuntimeConfig.SIGMOID_REAL, # Sigmoid计算模式
    }
}

# 创建SPU设备
# spu_instance = sf.SPU(cluster_def=spu_cluster_config) # 原写法
# 增加重试参数，提高鲁棒性
spu_instance = sf.SPU(
    cluster_def=spu_cluster_config,
    link_desc={'connect_retry_times': 60, 'connect_retry_interval_ms': 1000}
)

print("SPU 初始化成功!")

"""
函数：sf.SPU
功能：创建一个SPU（Secure Processing Unit）设备实例，用于执行安全多方计算。
参数：
    cluster_def (dict): SPU集群的定义。
        nodes (list): 包含SPU节点的列表，每个节点是一个字典，指定 'party' (参与方名称) 和 'address' (SPU服务地址)。
        runtime_config (dict): SPU运行时配置。
            protocol (spu.spu_pb2.ProtocolKind): MPC协议类型，如 SEMI2K, ABY3 等。
            field (spu.spu_pb2.FieldType): 计算使用的有限域类型，如 FM64, FM128。
            fxp_fraction_bits (int, optional): 定点数小数位数，默认为18。
            ... (其他高级配置)
    link_desc (dict, optional): SPU节点间链接的描述，用于配置链接参数如重试次数、超时等。
        connect_retry_times (int): 连接重试次数。
        connect_retry_interval_ms (int): 连接重试间隔（毫秒）。
        ...
返回：
    SPUDevice: SPU设备对象。
"""
```
**说明**:
此单元格创建了SPU设备，这是执行后续加密计算和秘密共享计算的基础。确保`nodes`中各方的地址和端口正确无误。`link_desc`有助于在网络不稳定的情况下提高连接成功率。

---
#### 单元格 6: 定义PYU参与方实例
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
PYU (Python Unit) 代表了在每个物理参与方节点上运行的Python环境。我们需要为每个参与方创建一个PYU实例，后续的数据加载和部分本地操作会指定在这些PYU上执行。

```python
bank_pyu = sf.PYU(BANK_PARTY_NAME)
agency_pyu = sf.PYU(AGENCY_PARTY_NAME)

print(f"PYU实例创建完成: {bank_pyu}, {agency_pyu}")
```
**说明**:
`bank_pyu` 和 `agency_pyu` 将用于指定数据的所有权和计算的执行位置。

---
#### 单元格 7: 数据加载与对齐 (纵向联邦VDataFrame)
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
在纵向联邦学习中，数据按特征垂直切分存储在不同参与方。`secretflow.data.vertical.read_csv` 函数能够从各方加载数据，并根据指定的 `keys` (对齐键，如此处的 `ID_COLUMN`) 将它们融合成一个逻辑上的垂直数据表 (VDataFrame)。
`drop_keys=True` (或指定列名)可以在对齐后删除对齐键本身，如果它不再作为特征使用。
`spu=spu_instance` 参数传入是为了一些VDataFrame上的操作可能需要SPU支持（例如某些转换或后续计算）。

```python
from secretflow.data.vertical import read_csv

# 构建各方数据路径字典
# 值是对应PYU设备上数据文件的绝对路径
data_paths = {
    bank_pyu: BANK_DATA_FILE,
    agency_pyu: AGENCY_DATA_FILE,
}

# 加载纵向数据，并使用ID_COLUMN进行对齐
vdf = read_csv(
    data_paths,
    spu=spu_instance, # 传入SPU实例
    keys=ID_COLUMN,      # 对齐键
    drop_keys=ID_COLUMN  # 对齐后删除ID列
)

print("纵向数据VDataFrame加载完成。")
print(f"VDF行数: {vdf.shape[0]}, VDF总列数: {vdf.shape[1]}") # vdf.shape 返回 (行数, 总列数)
print(f"VDF列名: {vdf.columns}")

"""
函数：secretflow.data.vertical.read_csv
功能：从多个参与方读取CSV文件，并按指定键对齐，形成一个纵向联邦数据框（VDataFrame）。
参数：
    filepaths (Dict[PYU, str]): 一个字典，键是PYU设备，值是该设备上CSV文件的路径。
    keys (Union[str, List[str], Dict[PYU, Union[str, List[str]]]]): 用于对齐数据的列名或列名列表。
        - 如果是字符串或列表，则所有参与方都使用这些列名。
        - 如果是字典，则为每个PYU指定其私有的对齐列名。
    spu (SPUDevice, optional): 用于PSI对齐的SPU设备，如果keys是对齐算法（如PSI）则需要。对于简单列名对齐，可能非必需，但最好提供。
    drop_keys (Union[bool, str, List[str]], optional): 是否在对齐后删除对齐键。True表示删除所有键，也可以指定要删除的键名。默认为False。
    psi_protocol (str, optional): 如果使用PSI对齐，指定的PSI协议。
    ... (其他参数如 dtypes, converters 等，类似pandas.read_csv)
返回：
    VDataFrame: 加载并对齐后的纵向联邦数据框。
"""
```
**说明**:
此单元格使用`read_csv`从银行和支付平台加载数据，并通过`ID_COLUMN` (`id`)列将它们对齐成一个 `VDataFrame`。`vdf.shape` 和 `vdf.columns` 可以帮助我们验证数据加载是否符合预期。

---
#### 单元格 8: 特征工程 - 独热编码 (One-Hot Encoding)
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
机器学习模型通常不能直接处理类别文本数据，需要将其转换为数值形式。独热编码是一种常用的方法，它为类别特征的每个唯一值创建一个新的二元（0或1）特征。
`secretflow.preprocessing.encoder.OneHotEncoder` 可以在VDataFrame上执行此操作。它会作用于VDataFrame中的指定列，无论该列实际存储在哪一方。

```python
from secretflow.preprocessing.encoder import OneHotEncoder

encoder = OneHotEncoder()

print(f"独热编码前的列: {vdf.columns}")
cols_to_drop_after_ohe = [] # 收集原始的被编码的列名

for col_name in CATEGORICAL_COLS_OHE:
    if col_name in vdf.columns: # 确保列存在
        # 对撞击DataFrame的指定列进行独热编码
        # fit_transform会返回一个新的VDataFrame，只包含编码后的列
        encoded_col_vdf = encoder.fit_transform(vdf[col_name])
        
        # 将编码后的列添加回主VDataFrame
        # 注意：列名将是原列名_类别值 的形式
        for new_col in encoded_col_vdf.columns:
            vdf[new_col] = encoded_col_vdf[new_col]
        
        cols_to_drop_after_ohe.append(col_name) # 记录原始列名，稍后删除
        print(f"列 '{col_name}' 完成独热编码，新增列: {encoded_col_vdf.columns}")
    else:
        print(f"警告: 列 '{col_name}' 在VDataFrame中未找到，跳过独热编码。")

# 删除原始的类别特征列
if cols_to_drop_after_ohe:
    vdf = vdf.drop(columns=cols_to_drop_after_ohe)
    print(f"原始类别列 {cols_to_drop_after_ohe} 已被删除。")

print(f"独热编码后的VDF总列数: {vdf.shape[1]}")
print(f"独热编码后的部分列: {vdf.columns[:5]} ... {vdf.columns[-5:]}")

"""
函数：secretflow.preprocessing.encoder.OneHotEncoder.fit_transform
功能：对VDataFrame中的指定单个类别特征列进行拟合并执行独热编码转换。
参数：
    X (VDataFrame Partition): 包含单个待编码列的VDataFrame partition (例如 vdf['column_name'])。
返回：
    VDataFrame: 一个新的VDataFrame，包含原始列被独热编码后产生的新列。
                 新列的名称通常是 '原始列名_类别值' 的形式。
"""
```
**说明**:
此单元格对 `CATEGORICAL_COLS_OHE` 列表中定义的类别特征进行了独热编码。编码后的新特征列被添加回 `vdf`，原始的类别列随后被删除。每次编码都会打印日志，方便跟踪。

---
#### 单元格 9: 特征工程 - 特征标准化 (Standard Scaling)
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
特征标准化（通常是Z-score标准化）将数据转换为均值为0、标准差为1的分布。这对于许多机器学习算法（如逻辑回归、SVM、神经网络）的性能至关重要，因为它可以防止数值范围较大的特征主导模型训练过程。
`secretflow.preprocessing.StandardScaler` 可以在VDataFrame上对指定的数值列执行此操作。

```python
from secretflow.preprocessing import StandardScaler

# 确保所有待标准化的列都存在于VDF中
actual_cols_to_scale = [col for col in NUMERICAL_COLS_SCALE if col in vdf.columns]
if not actual_cols_to_scale:
    print("警告: 没有在VDF中找到需要标准化的数值列。")
else:
    print(f"将对以下列进行标准化: {actual_cols_to_scale}")
    
    # 提取需要标准化的列构成一个新的VDataFrame
    numerical_vdf_to_scale = vdf[actual_cols_to_scale]

    scaler = StandardScaler()
    # fit_transform 会返回一个新的VDataFrame，其中包含标准化后的列
    # 这些新列会覆盖原始VDataFrame中同名的列
    scaled_numerical_vdf = scaler.fit_transform(numerical_vdf_to_scale)
    
    # 将标准化后的列更新回主VDataFrame
    # StandardScaler的fit_transform返回的VDataFrame列名与输入列名相同
    for col_name in scaled_numerical_vdf.columns:
        vdf[col_name] = scaled_numerical_vdf[col_name]
        
    print("数值特征标准化完成。")

# 验证一下某列（如果存在）是否大致符合标准化后的特性 (均值接近0)
# 注意：vdf.mean() 是一个耗时操作，且结果在SPU上，需要reveal才能查看
# if "loanAmnt" in actual_cols_to_scale:
#     # mean_loanAmnt_spu = vdf["loanAmnt"].mean() # 此操作返回SPUObject
#     # print(f"loanAmnt的均值 (SPU对象): {mean_loanAmnt_spu}")
#     # print(f"揭秘后的loanAmnt均值: {sf.reveal(mean_loanAmnt_spu)}") # 应该接近0
      pass

"""
函数：secretflow.preprocessing.StandardScaler.fit_transform
功能：对VDataFrame中的指定数值特征列进行拟合并执行标准化转换。
参数：
    X (VDataFrame): 包含待标准化数值列的VDataFrame。
返回：
    VDataFrame: 一个新的VDataFrame，其中包含了输入VDataFrame中被标准化后的列。
                 列名与输入VDataFrame中的原始列名保持一致。
"""
```
**说明**:
此单元格对 `NUMERICAL_COLS_SCALE` 列表中定义的数值特征进行了标准化。标准化后的列会更新 `vdf` 中对应的原始列。

---
#### 单元格 10: 划分特征与标签
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
在模型训练前，我们需要明确地将数据集划分为特征集（X）和目标变量/标签（y）。标签列 (`LABEL_COLUMN`) 在银行方的数据中。

```python
# 确保标签列在VDataFrame中，并且属于银行方
if LABEL_COLUMN not in vdf.columns or bank_pyu not in vdf.partitions[LABEL_COLUMN].devices:
    raise ValueError(f"标签列 '{LABEL_COLUMN}' 未找到或不属于银行方 '{BANK_PARTY_NAME}'。请检查配置和数据。")

y_label = vdf[LABEL_COLUMN]
X_features = vdf.drop(columns=[LABEL_COLUMN])

print(f"特征集 X_features 的列数: {X_features.shape[1]}")
print(f"标签 y_label 的形状 (应为一维): {y_label.shape}") # VDataFrame单列时shape[1]可能不存在或为1
print(f"标签 y_label 的持有方: {y_label.partitions.keys()}") # 应该只显示bank_pyu
```
**说明**:
此单元格成功将 `vdf` 划分成了特征集 `X_features` 和标签 `y_label`。同时做了一个简单的校验，确保标签列存在且属于银行方。

---
#### 单元格 11: 同态加密 (HEU) 配置
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行，配置需一致)

**思考**:
HESS（Homomorphic Encryption based Secure Sharing）逻辑回归依赖同态加密来保护梯度等中间信息的隐私。我们需要为参与计算的各方配置HEU（Homomorphic Encryption Unit）。
`HESSLogisticRegression` 模型通常需要两个 HEU 实例，一个主要用于持有私钥并执行解密操作（`sk_keeper`），另一个或多个用于在加密数据上进行计算（`evaluators`）。在本案例中，HESS模型内部会协调使用这两个HEU实例。
原案例中 `heu_bank` 和 `heu_agency` 的配置方式是为HESS算法准备的，HESS算法内部会区分这两个HEU的使用场景。

```python
# 通用HEU配置模板
base_heu_config = {
    'mode': 'PHEU', # Paillier Homomorphic Encryption Unit
    'he_parameters': {
        'schema': 'ou', # Okamoto-Uchiyama, 一种Paillier的变体，支持较大明文空间
        'key_pair': {'generate': {'bit_size': 2048}}, # 密钥长度
    },
    'encoding': { # 明文编码配置，对于整数数据
        'cleartext_type': 'DT_I32', # 明文数据类型
        'encoder': "IntegerEncoder",    # 编码器类型
        'encoder_args': {"scale": 1},   # 编码参数，scale=1表示不缩放整数
    }
}

# 为银行方配置HEU
# 在HESS LR中，一方（如银行）通常负责聚合加密梯度，可能持有密钥
config_heu_bank = base_heu_config.copy()
config_heu_bank['sk_keeper'] = {'party': BANK_PARTY_NAME}
config_heu_bank['evaluators'] = [{'party': AGENCY_PARTY_NAME}] # 支付平台可以在银行的密文上计算
heu_bank_device = sf.HEU(config_heu_bank, spu_instance.cluster_def['runtime_config']['field'])

# 为支付平台方配置HEU
# 另一方（如支付平台）可能负责加密自己的部分梯度
# 在HESS中，双方角色可能更对称或根据具体步骤切换
# 简单起见，这里也让支付平台持有自己的密钥，银行可以在其密文上计算
# 或者，更常见的HESS模式是，一方加密，另一方持有密钥进行聚合解密
# 原案例的做法是让双方都有一个HEU实例，HESSLogisticRegression构造函数接收这两个实例
# 我们遵循原案例的思路，它暗示了HESS内部对这两个HEU的特定使用方式
import copy
config_heu_agency = copy.deepcopy(base_heu_config) # 使用深拷贝
config_heu_agency['sk_keeper'] = {'party': AGENCY_PARTY_NAME}
config_heu_agency['evaluators'] = [{'party': BANK_PARTY_NAME}]
heu_agency_device = sf.HEU(config_heu_agency, spu_instance.cluster_def['runtime_config']['field'])


print("HEU设备初始化完成:")
print(f"Bank HEU: {heu_bank_device}")
print(f"Agency HEU: {heu_agency_device}")

"""
函数：sf.HEU
功能：创建一个HEU（Homomorphic Encryption Unit）设备实例，用于执行同态加密操作。
参数：
    config (dict): HEU的配置字典。
        mode (str): HEU工作模式，如 'PHEU', 'LHEU', 'FHEU' 等。
        sk_keeper (dict): 指定私钥持有方的party信息，格式如 {'party': 'alice'}。
        evaluators (list): 指定可以在密文上进行计算的评估方party信息列表，格式如 [{'party': 'bob'}]。
        he_parameters (dict): 同态加密方案参数。
            schema (str): 加密方案名称，如 'paillier', 'ou', 'bfv', 'ckks'。
            key_pair (dict): 密钥对生成参数，如 {'generate': {'bit_size': 2048}}。
        encoding (dict, optional): 明文编码方案配置。
            cleartext_type (str): 明文类型。
            encoder (str): 编码器名称，如 'IntegerEncoder', 'PlainEncoder', 'FractionEncoder'。
            encoder_args (dict): 编码器参数。
    field_type (spu.spu_pb2.FieldType): SPU的计算域类型，HEU需要与SPU在同一域上操作或能兼容。
返回：
    HEUDevice: HEU设备对象。
"""
```
**说明**:
此单元格配置并初始化了银行和支付平台各自的HEU设备。`HESSLogisticRegression` 将利用这些设备来安全地交换和处理梯度信息。`sk_keeper` 和 `evaluators` 的设置定义了各方在同态加密方案中的角色。

---
#### 单元格 12: 模型训练 - HESS 逻辑回归
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
`secretflow.ml.linear.hess_sgd.HESSLogisticRegression` 是隐语提供的基于HESS框架的逻辑回归模型。它能够在多方数据上进行训练，同时通过同态加密和秘密共享保护数据隐私。
构造函数需要传入SPU实例和双方的HEU实例。`fit` 方法启动训练过程。

```python
from secretflow.ml.linear.hess_sgd import HESSLogisticRegression

# 创建HESS逻辑回归模型实例
# 注意这里传入了 spu_instance, heu_agency_device, 和 heu_bank_device
# 模型内部会根据算法需要，在这些设备间调度计算任务
hess_model = HESSLogisticRegression(
    spu_device=spu_instance,
    server_he_device=heu_bank_device,    # 通常“服务器”方HEU，可能负责聚合
    client_he_device=heu_agency_device   # 通常“客户端”方HEU，可能负责加密本地信息
                                        # HESS LR内部对server/client的定义可能与我们直观的bank/agency不同，
                                        # 但它需要两个HEU实例来协调加密计算。
)

print(f"开始训练HESS逻辑回归模型，Epochs: {HESS_EPOCHS}, Batch Size: {HESS_BATCH_SIZE}")

# 训练模型
# X_features 是VDataFrame, y_label 是VDataFrame的单列（标签）
hess_model.fit(
    X_features,
    y_label,
    epochs=HESS_EPOCHS,
    batch_size=HESS_BATCH_SIZE,
    learning_rate=0.1, # 可以调整学习率
    # 其他参数可以根据需要添加，如正则化等
)

print("HESS逻辑回归模型训练完成。")

"""
类：secretflow.ml.linear.hess_sgd.HESSLogisticRegression
功能：基于HESS（Homomorphic Encryption based Secure Sharing）框架的纵向联邦逻辑回归模型。
构造参数：
    spu_device (SPUDevice): 用于执行秘密共享计算的SPU设备。
    server_he_device (HEUDevice): HESS协议中“服务器”角色的HEU设备，通常负责持有密钥和进行部分解密/聚合。
    client_he_device (HEUDevice): HESS协议中“客户端”角色的HEU设备，通常负责加密本地数据/梯度。
    
方法：fit
功能：在输入的纵向特征数据和标签上训练模型。
参数：
    x (VDataFrame): 包含特征的纵向联邦数据框。
    y (VDataFrame Partition): 包含标签的VDataFrame partition（通常是单列）。
    epochs (int): 训练的总轮数。
    batch_size (int): 每批次训练的样本数量。
    learning_rate (float, optional): 学习率。
    ... (其他训练参数如正则化权重、容忍度等)
"""
```
**说明**:
此单元格实例化并训练了`HESSLogisticRegression`模型。训练过程涉及复杂的加密交互，但对用户而言API调用是简洁的。`server_he_device` 和 `client_he_device` 的命名是基于HESS框架内部的角色划分，不一定严格对应bank/agency，但模型需要这两个配置好的HEU实例。

---
#### 单元格 13: 模型预测
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行)

**思考**:
训练完成后，可以使用模型的 `predict` 方法对新的（或训练用的）特征数据进行预测。预测结果将是加密的或在SPU上的秘密共享值。

```python
print("使用训练好的模型进行预测...")
# 对特征集X_features进行预测，得到预测概率（或其加密/共享形式）
y_pred_secure = hess_model.predict(X_features)

print("预测完成。预测结果为安全对象 (SPUObject 或 HEUObject)。")
print(type(y_pred_secure)) # 可以查看安全对象的类型

"""
方法：HESSLogisticRegression.predict
功能：使用训练好的HESS逻辑回归模型对输入的特征数据进行预测。
参数：
    x (VDataFrame): 包含待预测特征的纵向联邦数据框。
返回：
    Union[SPUObject, HEUObject]: 预测结果的安全对象，通常是每个样本的预测概率（或其加密/共享形式）。
                                  具体类型取决于HESS协议的实现和最后一步。
"""
```
**说明**:
此单元格生成了预测结果 `y_pred_secure`。这是一个安全对象，其内容对各方不可直接见，需要通过 `sf.reveal` 来获取明文（如果策略允许）。

#### 单元格 14: 结果揭露与模型评估
**执行方**: 银行 `bank` (主要执行评估，因为标签在其手中), 支付平台 `agency` (参与揭露过程，因为预测结果是双方协作计算得出)

**思考**:
为了评估模型性能，我们需要将安全预测结果 `y_pred_secure` 和真实的标签 `y_label` 转换为明文。`sf.reveal()` 函数用于此目的，它会将SPUObject或HEUObject的内容揭露给指定的PYU。
由于标签 `y_label` 最初由银行方持有，并且评估通常在持有标签的一方进行，我们将预测结果和真实标签都揭露给银行方进行AUC计算。

```python
import numpy as np # 确保numpy已导入，sklearn评估函数通常需要numpy数组
print("正在揭露预测结果和真实标签以进行评估...")

# 步骤1: 揭露预测结果 (y_pred_secure)
# y_pred_secure 是模型predict方法返回的安全对象，可能是一个VDataFrame Partition，其数据在SPU或HEU上。
# 我们需要将其转换为PYUObject，然后揭露给银行方。
# .to_pyu(bank_pyu) 会尝试将数据转移到银行方的PYU设备上（如果不是直接在其上计算的话）
# 注意：如果y_pred_secure是SPUObject，它本身不直接关联到单个PYU，reveal时会揭露给所有SPU参与方，
# 然后由bank_pyu所在的节点获取。如果它是HEUObject，则会揭露给HEU的sk_keeper。
# HESSLogisticRegression.predict返回的是一个VDataFrame Partition (单列)，其device是SPU。
# 所以sf.reveal(y_pred_secure)会将SPU上的值揭露给所有SPU参与方。银行方节点可以直接使用揭露后的结果。
y_pred_revealed_on_bank = sf.reveal(y_pred_secure) # 结果会是字典 {PYUDevice: value} 或直接是value
                                                # 取决于reveal的对象和上下文。
                                                # 对于来自SPU的VDF Partition，通常是返回一个值给发起reveal的节点。
                                                # 这里假设是在银行方笔记本执行，所以银行方能拿到。
                                                # 为了更明确，可以指定接收方，但对于SPU上的VDF Partition，
                                                # reveal后，持有该partition的PYU（如果有明确的物理划分）或发起方可以直接使用。
                                                # 我们假设执行此单元格的是银行方。

# 步骤2: 准备真实标签 (y_label)
# y_label 是一个VDataFrame Partition，其数据物理存储在bank_pyu上。
# 我们需要获取其底层的具体数据（通常是numpy数组）。
y_true_pyu_object_on_bank = y_label.partitions[bank_pyu].data # 获取银行方PYU上的PYUObject
y_true_revealed_on_bank = sf.reveal(y_true_pyu_object_on_bank) # 将其揭露（实际上它已经是明文在bank方）

# 确保揭露的数据是适合sklearn评估的格式 (通常是1D numpy array)
# sf.reveal返回的是原始数据类型，可能是pandas Series/DataFrame或numpy array
if isinstance(y_pred_revealed_on_bank, pd.DataFrame):
    # 如果预测结果是DataFrame，假设预测概率在第一列或名为'pred'的列
    if y_pred_revealed_on_bank.shape[1] == 1:
        y_pred_final = y_pred_revealed_on_bank.iloc[:, 0].values
    elif 'pred' in y_pred_revealed_on_bank.columns: # 假设列名为 'pred'
        y_pred_final = y_pred_revealed_on_bank['pred'].values
    else: # Fallback or error
        print("警告: 预测结果是多列DataFrame且无'pred'列, 取第一列作为预测值。")
        y_pred_final = y_pred_revealed_on_bank.iloc[:, 0].values
elif isinstance(y_pred_revealed_on_bank, pd.Series):
    y_pred_final = y_pred_revealed_on_bank.values
elif isinstance(y_pred_revealed_on_bank, list):
    y_pred_final = np.array(y_pred_revealed_on_bank)
else: # 假设已经是numpy array
    y_pred_final = y_pred_revealed_on_bank

if isinstance(y_true_revealed_on_bank, pd.Series):
    y_true_final = y_true_revealed_on_bank.values
elif isinstance(y_true_revealed_on_bank, list):
    y_true_final = np.array(y_true_revealed_on_bank)
else: # 假设已经是numpy array
    y_true_final = y_true_revealed_on_bank


# 确保y_pred_final和y_true_final是一维的
y_pred_final = np.squeeze(y_pred_final)
y_true_final = np.squeeze(y_true_final)

print(f"揭露的预测值样本 (前5个): {y_pred_final[:5]}")
print(f"揭露的真实标签样本 (前5个): {y_true_final[:5]}")
print(f"预测值形状: {y_pred_final.shape}, 真实标签形状: {y_true_final.shape}")


# 步骤3: 在银行方计算AUC
# 注意：此部分代码只应在银行方（或有权访问揭秘数据的分析方）的 SecretNote 单元格中执行
# 且需要选中银行节点作为执行方。
auc_score_value = -1.0 # 默认值
if sf. действующий_узел() == BANK_PARTY_NAME: # 伪代码，实际应根据SecretNote的执行上下文判断
                                        # 或者直接假设执行此单元格的就是银行方
    if len(np.unique(y_true_final)) > 1: # 确保标签至少有两个类别才能计算AUC
        auc_score_value = roc_auc_score(y_true_final, y_pred_final)
        print(f"在银行方计算得到的模型 AUC: {auc_score_value:.4f}")
    else:
        print("警告: 真实标签中只包含一个类别，无法计算AUC。")
else:
    print(f"节点 {sf. действующий_узел()} 不是银行方，不执行AUC计算。AUC结果将在银行方输出。") # 伪代码

"""
函数：sf.reveal
功能：将一个或多个安全对象（DeviceObject，如SPUObject、HEUObject）或PYUObject的值揭露给指定的PYU设备（们）或当前Python环境。
参数：
    device_object (Union[DeviceObject, PYUObject, Sequence[DeviceObject], Sequence[PYUObject]]):
        需要揭露的安全对象或PYUObject，或者它们的序列。
    pyu_device (PYU, optional):
        指定接收揭露结果的PYU设备。
        - 如果 device_object 是 PYUObject 且其所在设备与 pyu_device 不同，会尝试数据传输。
        - 如果 device_object 是 DeviceObject (SPU/HEU)，结果将传输到 pyu_device。
        - 如果为 None (默认)，对于 PYUObject，结果返回到当前 Python 环境；
          对于 SPUObject，结果会返回给所有 SPU 参与方的 Python 环境；
          对于 HEUObject，结果通常返回给私钥持有方 (`sk_keeper`) 的 Python 环境。
返回：
    与输入类型对应的明文值或值的序列。例如，如果输入是单个SPUObject，返回其对应的numpy数组或pandas DataFrame/Series。
    如果输入是PYUObject，返回其包含的Python对象。
"""
```
**说明**:
此单元格的核心是 `sf.reveal`，它使得我们能够安全地获取加密或共享的计算结果用于评估。预测结果 `y_pred_secure` (SPU上的VDataFrame Partition) 和真实标签 `y_label` (银行PYU上的数据) 被揭露。随后，使用 `roc_auc_score` 在银行方计算模型的AUC值。对揭露后数据的格式进行了一些处理，以确保与 `roc_auc_score` 的输入要求兼容。

---
#### 单元格 15: 清理与关闭
**执行方**: 银行 `bank`, 支付平台 `agency` (双方共同执行以释放资源)

**思考**:
实验完成后，及时关闭 SecretFlow 集群和 SPU/HEU 设备是个好习惯，这样可以释放占用的网络端口和计算资源。

```python
# 尝试关闭HEU设备 (如果需要显式关闭，取决于具体版本和实现)
# 通常sf.shutdown()会处理
# if 'heu_bank_device' in locals() and heu_bank_device:
#     try:
#         pass # heu_bank_device.shutdown() or similar, if available
#     except AttributeError:
#         pass
# if 'heu_agency_device' in locals() and heu_agency_device:
#     try:
#         pass # heu_agency_device.shutdown() or similar, if available
#     except AttributeError:
#         pass

# 关闭SPU设备
if 'spu_instance' in locals() and spu_instance:
    try:
        spu_instance.shutdown()
        print("SPU 设备已关闭。")
    except Exception as e:
        print(f"关闭SPU时出错: {e}")


# 关闭SecretFlow Ray Fed集群
if sf.is_initialized():
    sf.shutdown()
    print("SecretFlow 集群已关闭。")

print("实验资源清理完成。")
```
**说明**:
此单元格调用 `spu_instance.shutdown()` 和 `sf.shutdown()` 来分别关闭SPU和Ray Fed集群。这有助于确保环境的干净，并为下一次实验或在同一端口上运行其他服务做好准备。HEU设备通常会随着`sf.shutdown()`被清理，但显式关闭（如果API支持）也是可以考虑的。

---

这样，我们就以一种更结构化、逐步推进并带有API分析的方式重构了“金融风险预测”案例的Notebook。每个单元格都有明确的执行方和功能说明。

好的，我们来整理第二个案例“黑名单求交 (PSI 应用)”的实验报告。我会借鉴第一个案例的结构，但力求更精简，专注于核心流程和API的理解。

---

### 案例2：黑名单求交 (PSI 应用)

**实验背景：**
在线金融服务的普及带来了便利，但也加剧了开户欺诈的风险。欺诈者可能使用虚假信息或盗用身份开设账户。为了有效打击此类行为，银行（`bank`）与公安部门（`police`）需要合作。银行持有银行卡数据，公安部门拥有身份证数据，双方希望在不泄露各自全部数据的前提下，找出共同的用户记录（例如，银行中与公安记录匹配的账户），以识别潜在风险。

**实验目的**：

1.  理解隐私集合求交 (Private Set Intersection, PSI) 的基本原理及其在数据安全和隐私保护中的应用。
2.  掌握使用隐语 SecretFlow 平台配置和执行两方 PSI 任务的核心步骤。
3.  熟悉 `spu.psi` 接口的关键参数，如求交键 (`keys`)、输入输出路径 (`input_path`, `output_path`)、结果接收方 (`receiver`)、结果广播 (`broadcast_result`) 以及求交协议 (`protocol`)。
4.  学习如何在不暴露非交集数据的前提下，安全地获得两方数据集的交集信息。

**实验设计思路与核心API分析：**

本实验的核心是利用隐语的PSI功能，在银行和公安两方之间安全地找出共有的用户ID (`uid`)。

1.  **环境初始化 (`sf.init`, `sf.SPU`)**:
    *   与前一个实验类似，首先需要通过 `sf.init` 初始化Ray Fed集群，使`bank`和`police`能够通信。每个参与方都需要在其节点上执行此操作，并配置好包含双方网络信息的 `cluster_config`。
    *   PSI运算（特别是如ECDH这类高效协议）通常直接由SPU的底层库支持，或者SPU作为一个协调和通信的框架。`sf.SPU` 用于创建SPU实例，定义参与节点和基础MPC配置（即使PSI协议本身可能不完全依赖于通用的MPC协议如SEMI2K，SPU环境的建立仍是必要的）。

2.  **PSI任务配置与执行 (`spu.psi`)**:
    *   **核心API**: `spu.psi()` (其中 `spu` 是 `sf.SPU` 的实例)。这个函数封装了执行PSI的整个流程。
    *   **输入/输出路径**: 需要为各方指定其本地的输入CSV文件路径 (`input_path`) 和期望的输出CSV文件路径 (`output_path`)。输出文件中将包含交集结果（或其一部分，取决于配置）。
    *   **求交键 (`keys`)**: 通过字典形式指定，键为参与方名称，值为该参与方数据中用作求交的列名列表。例如 `{"bank": ["uid"], "police": ["uid"]}`。
    *   **结果接收方 (`receiver`)**: 指定哪个参与方会接收到完整的交集内容。例如 `receiver = "bank"` 表示银行方将获得结果。
    *   **结果广播 (`broadcast_result`)**: 布尔值。如果为 `False`（本案例设置），则只有 `receiver` 指定的参与方能得到真实的交集数据，其他方的输出文件可能为空或仅包含其自身数据中属于交集的部分，但不会得到对方的非交集信息或完整的交集。如果为 `True`，则所有参与方都会得到交集结果（这通常在某些场景下需要，但会暴露更多信息）。
    *   **PSI协议 (`protocol`)**: 指定使用的PSI协议，例如 `"PROTOCOL_ECDH"` (基于椭圆曲线Diffie-Hellman的PSI)。不同的协议在效率和安全性假设上有所不同。`ecdh_curve` 是ECDH协议的特定参数。
    *   **执行**: 调用 `spu.psi()` 后，隐语框架会在后台协调`bank`和`police`执行选定的PSI协议，计算交集并将结果写入指定路径。

3.  **结果查看**:
    *   PSI任务完成后，`receiver` 指定的参与方（本例中为`bank`）可以在其本地的 `output_path` 查看到包含交集记录的CSV文件。
    *   可以使用 `pandas` 等工具读取和分析这个结果文件。
    *   `spu.psi()` 函数的返回值通常会包含求交的统计信息，如各方原始记录数和交集记录数。

整个流程设计简洁，`spu.psi` 接口高度封装了复杂的PSI协议细节，使得用户可以方便地在多方数据间进行隐私保护的集合求交。

---
#### 单元格 1: 环境准备与导入库
**执行方**: 银行 `bank`, 公安 `police` (双方都需要执行)

```python
import secretflow as sf
import spu
import os

# 网络工具，用于获取可用端口
import socket
from contextlib import closing
from typing import cast

# 用于查看结果
import pandas as pd

print(f"SecretFlow版本: {sf.__version__}")
print(f"SPU版本: {spu.__version__}")
```
**说明**: 导入基础库和用于后续查看结果的pandas。

---
#### 单元格 2: 全局配置与常量定义
**执行方**: 银行 `bank`, 公安 `police` (双方应保持这些配置一致)

```python
# 参与方定义
BANK_PARTY_NAME = 'bank'
POLICE_PARTY_NAME = 'police'

# 数据对齐键
KEY_COLUMN = 'uid'

# PSI 协议参数
PSI_PROTOCOL = "PROTOCOL_ECDH"
PSI_CURVE = "CURVE_25519" # ECDH PSI 使用的曲线

# 数据文件路径 (假设数据文件已上传至各方工作目录)
# 这些路径是各参与方节点的本地路径
CURRENT_DIR = os.getcwd() # 各自获取自己的当前工作目录

BANK_INPUT_FILE = os.path.join(CURRENT_DIR, 'payment.csv')
POLICE_INPUT_FILE = os.path.join(CURRENT_DIR, 'record.csv')

BANK_OUTPUT_FILE = os.path.join(CURRENT_DIR, 'payment_intersect.csv')
POLICE_OUTPUT_FILE = os.path.join(CURRENT_DIR, 'police_intersect.csv') # 虽然police方不会收到完整结果，但仍需指定输出路径
```
**说明**: 定义参与方名称、求交键、PSI协议参数以及各方数据文件的输入输出路径。

---
#### 单元格 3: 工具函数 - 获取可用TCP端口
**执行方**: 银行 `bank`, 公安 `police` (双方都需要此函数)

```python
def unused_tcp_port() -> int:
    """返回一个未被使用的TCP端口。"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return cast(int, sock.getsockname()[1])

# 测试一下函数
print(f"获取到的一个可用端口: {unused_tcp_port()}")
```
**说明**: 用于为Ray Fed和SPU分配不冲突的网络端口。

---
#### 单元格 4: SecretFlow 集群初始化 (Ray Fed)
**执行方**:
1.  **银行 `bank` 单独执行** (修改 `self_party`，并填入正确的IP和用`unused_tcp_port()`获取的端口)
2.  **公安 `police` 单独执行** (修改 `self_party`，并填入正确的IP和用`unused_tcp_port()`获取的端口)

```python
# !!! 请各方根据实际获得的IP和动态端口替换下面的示例值 !!!
# 假设 bank_actual_ip, bank_ray_port 已经获取 (e.g., "172.16.0.1", 55795)
# 假设 police_actual_ip, police_ray_port 已经获取 (e.g., "172.16.0.252", 41371)

# --------- 银行 bank 节点执行此部分 -----------
# current_party_for_init = BANK_PARTY_NAME
# bank_actual_ip = "172.16.0.1"
# bank_ray_port = 55795 # unused_tcp_port()
# police_actual_ip = "172.16.0.252"
# police_ray_port = 41371 # unused_tcp_port()
# --------------------------------------------

# --------- 公安 police 节点执行此部分 -----
current_party_for_init = POLICE_PARTY_NAME
bank_actual_ip = "172.16.0.1"
bank_ray_port = 55795 # unused_tcp_port()
police_actual_ip = "172.16.0.252"
police_ray_port = 41371 # unused_tcp_port()
# --------------------------------------------

cluster_config_fed = {
    'parties': {
        BANK_PARTY_NAME: {'address': f'{bank_actual_ip}:{bank_ray_port}', 'listen_addr': f'0.0.0.0:{bank_ray_port}'},
        POLICE_PARTY_NAME: {'address': f'{police_actual_ip}:{police_ray_port}', 'listen_addr': f'0.0.0.0:{police_ray_port}'},
    },
    'self_party': current_party_for_init
}

if sf.is_initialized():
    sf.shutdown()
sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_fed, logging_level='INFO')
print(f"节点 {current_party_for_init} Ray Fed 初始化成功!")
```
**说明**: 初始化Ray Fed集群，使银行和公安节点可以通信。**IP和端口必须正确填写**。

---
#### 单元格 5: SPU (Secure Processing Unit) 初始化
**执行方**: 银行 `bank`, 公安 `police` (双方共同执行，配置需一致)

```python
# !!! 请各方根据实际获得的IP和动态SPU端口替换下面的示例值 !!!
# 假设 bank_spu_port 已经获取 (e.g., 36097)
# 假设 police_spu_port 已经获取 (e.g., 49567)

# BANK_SPU_PORT = 36097 # unused_tcp_port() on bank
# POLICE_SPU_PORT = 49567 # unused_tcp_port() on police

spu_cluster_config = {
    'nodes': [
        {'party': BANK_PARTY_NAME, 'address': f'{bank_actual_ip}:{BANK_SPU_PORT}'},
        {'party': POLICE_PARTY_NAME, 'address': f'{police_actual_ip}:{POLICE_SPU_PORT}'},
    ],
    'runtime_config': { # SPU基础配置，PSI可能不直接使用SEMI2K，但SPU环境需要
        'protocol': spu.spu_pb2.SEMI2K,
        'field': spu.spu_pb2.FM128,
    }
}

spu_instance = sf.SPU(
    cluster_def=spu_cluster_config,
    link_desc={'connect_retry_times': 60, 'connect_retry_interval_ms': 1000}
)
print("SPU 初始化成功!")
```
**说明**: 创建SPU设备实例，为PSI运算提供底层支持。

---
#### 单元格 6: 执行PSI任务
**执行方**: 银行 `bank`, 公安 `police` (双方共同执行，但主要由一方发起逻辑调用，通常是SPU的master或协调方)

**思考**:
`spu_instance.psi()` 是执行PSI的核心函数。
- `keys`: 定义双方用于匹配的列，这里是`KEY_COLUMN` ('uid')。
- `input_path`: 各方数据源。
- `output_path`: 各方结果输出位置。
- `receiver`: 指定银行方接收完整交集。
- `broadcast_result=False`: 结果不广播，只有接收方能看到。
- `protocol` 和 `ecdh_curve`: 指定PSI的具体算法和参数。

```python
# 调用PSI函数
# SPU的PSI接口通常由一个参与方（例如拥有SPU对象的某一方）发起调用，
# 底层会在各参与方之间协调执行。
# 在SecretNote中，当双方都选中并执行此单元格时，SPU会处理这个任务。
psi_result_meta = spu_instance.psi(
    keys={BANK_PARTY_NAME: [KEY_COLUMN], POLICE_PARTY_NAME: [KEY_COLUMN]},
    input_path={BANK_PARTY_NAME: BANK_INPUT_FILE, POLICE_PARTY_NAME: POLICE_INPUT_FILE},
    output_path={BANK_PARTY_NAME: BANK_OUTPUT_FILE, POLICE_PARTY_NAME: POLICE_OUTPUT_FILE},
    receiver=BANK_PARTY_NAME,
    broadcast_result=False,
    protocol=PSI_PROTOCOL,
    ecdh_curve=PSI_CURVE
)

print("PSI 任务执行完成。")
print(f"PSI元数据结果: {psi_result_meta}") # 返回的是一个包含统计信息的列表
```
**说明**: 此单元格执行PSI求交。`psi_result_meta` 会包含双方的原始数量和交集数量（对于非接收方，交集数量可能为特殊值如-1）。

---
#### 单元格 7: 查看PSI结果 (在银行方)
**执行方**: 银行 `bank` (只有银行方能看到真实的交集内容)

**思考**:
由于 `receiver=BANK_PARTY_NAME` 且 `broadcast_result=False`，只有银行方能在其指定的 `BANK_OUTPUT_FILE` 中看到求交得到的真实数据。其他方（公安）的输出文件 `POLICE_OUTPUT_FILE` 不会包含银行独有的数据，通常是其自身数据中属于交集的部分，或者是空文件，这取决于具体的PSI协议实现和输出选项，但关键是公安方无法得知银行的全部交集内容或银行的非交集数据。

```python
# 此单元格仅在银行节点有意义查看真实内容
# 如果在公安节点执行，读取到的可能是空文件或不完整信息
# 在SecretNote中，选中 bank 节点执行此单元格

# 检查银行方输出文件是否存在且有内容
if os.path.exists(BANK_OUTPUT_FILE) and os.path.getsize(BANK_OUTPUT_FILE) > 0:
    intersect_data_bank = pd.read_csv(BANK_OUTPUT_FILE)
    print(f"银行方得到的交集数据 (前5行):")
    print(intersect_data_bank.head())
    print(f"银行方得到的交集大小: {len(intersect_data_bank)}")
else:
    print(f"银行方输出文件 '{BANK_OUTPUT_FILE}' 未找到或为空。请检查PSI任务是否成功以及路径配置。")

# 可以尝试在公安方也读取其输出文件，以验证隐私保护特性
# if current_party_for_init == POLICE_PARTY_NAME: # 假设在公安笔记本执行
#     if os.path.exists(POLICE_OUTPUT_FILE) and os.path.getsize(POLICE_OUTPUT_FILE) > 0:
#         intersect_data_police = pd.read_csv(POLICE_OUTPUT_FILE)
#         print(f"公安方得到的输出数据 (前5行):")
#         print(intersect_data_police.head())
#         print(f"公安方得到的输出数据大小: {len(intersect_data_police)}")
#     else:
#         print(f"公安方输出文件 '{POLICE_OUTPUT_FILE}' 未找到或为空，符合预期（非receiver且broadcast_result=False）。")

# 从psi_result_meta中提取银行方的交集数量进行核对
bank_intersection_count_from_meta = -1
for item in psi_result_meta:
    if item.get('party') == BANK_PARTY_NAME:
        bank_intersection_count_from_meta = item.get('intersection_count', -1)
        break
print(f"元数据中显示的银行方交集数量: {bank_intersection_count_from_meta}")
```
**说明**: 银行方可以加载并查看 `payment_intersect.csv` 得到交集。公安方的对应输出文件则不应包含完整的交集信息。同时，我们会从PSI任务的返回元数据中提取银行方的交集数量，与实际读取文件的大小进行比对。

---
#### 单元格 8: 清理与关闭
**执行方**: 银行 `bank`, 公安 `police` (双方共同执行)

```python
if 'spu_instance' in locals() and spu_instance:
    try:
        spu_instance.shutdown()
        print("SPU 设备已关闭。")
    except Exception as e:
        print(f"关闭SPU时出错: {e}")

if sf.is_initialized():
    sf.shutdown()
    print("SecretFlow 集群已关闭。")

print("实验资源清理完成。")
```
**说明**: 关闭SPU和Ray Fed集群，释放资源。

好的，我们来整理第三个案例“PIR 专利域名申请 (PIR 应用)”的实验报告。

---

### 案例3：PIR 专利域名申请 (PIR 应用)

**实验背景：**
在申请域名或专利时，申请人（`applicant`）通常需要向一个中央数据库（由服务提供方 `server` 维护）查询拟申请的名称是否已被注册。然而，申请人不希望服务提供方知晓其查询的具体内容，以防止查询的名称被服务方或其他恶意方抢先注册。私有信息检索（Private Information Retrieval, PIR）技术正是为此类场景设计的。

**实验目的**：

1.  理解私有信息检索 (PIR) 的基本概念和其在保护查询内容隐私方面的核心价值。
2.  掌握使用隐语 SecretFlow 平台配置和执行两方 PIR 查询任务的关键流程。
3.  熟悉 `spu.pir_query` 接口的主要参数，如服务端 (`server`)、客户端 (`client`)、服务端预处理数据路径 (`server_setup_path`)、客户端查询键列 (`client_key_columns`)、客户端查询文件路径 (`client_input_path`) 和结果输出路径 (`client_output_path`)。
4.  学习 PIR 技术如何允许客户端从服务端数据库检索信息，而服务端无法获知客户端具体查询的是哪条记录。
5.  了解 PIR 服务端数据预处理 (`pir_setup`，本实验使用其产物) 和相关密钥管理（如 `server_secret_key.bin`）在PIR方案中的重要性。

**实验设计思路与核心API分析：**

本实验的核心是利用隐语的PIR功能，使得专利申请方 `applicant` 能够安全地从服务提供方 `server` 的数据库中查询专利信息，而 `server` 不会知道 `applicant` 查询的具体专利ID。

1.  **环境初始化 (`sf.init`, `sf.SPU`)**:
    *   与前序实验类似，通过 `sf.init` 初始化Ray Fed集群，连接 `applicant` 和 `server`。
    *   `sf.SPU` 创建SPU实例。PIR的某些实现可能需要SPU进行一些辅助的密码学运算或通信协调，即使PIR协议本身有其特定的密码学基础。

2.  **服务端数据准备 (Server-Side Preprocessing)**:
    *   PIR通常需要服务端对其原始数据库进行一次性的预处理（`pir_setup` 阶段）。这个预处理过程会将数据库转换成一种PIR友好的格式，并可能生成服务端的公私钥对（或仅私钥，取决于PIR方案）。
    *   在本实验中，预处理产物 `pir_server_setup.tar`（包含预处理后的数据目录和 `server_secret_key.bin`）已提供。
    *   服务端需要解压 `pir_server_setup.tar`，并将解压出的 `server_secret_key.bin` 移动到指定的路径（如 `/tmp/server_secret_key.bin`），因为 `spu.pir_query` 的底层实现会从这个约定位置加载服务端密钥。
    *   `server_setup_path` 参数在 `pir_query` 中指向这个解压后的预处理数据目录。

3.  **PIR 查询执行 (`spu.pir_query`)**:
    *   **核心API**: `spu.pir_query()` (其中 `spu` 是 `sf.SPU` 的实例)。
    *   **参与方指定**: `server` 参数指定服务提供方的名称，`client` 参数指定查询方的名称。
    *   **服务端数据路径 (`server_setup_path`)**: 指向服务端上预处理数据的根目录。这个路径必须是 `server` 节点可以访问的。
    *   **客户端查询信息**:
        *   `client_key_columns`: 客户端查询文件 (`client_input_path`) 中用作查询键的列名（例如 `'uid'`）。
        *   `client_input_path`: 客户端（`applicant`）本地的CSV文件，包含一行或多行待查询的键值。
    *   **客户端结果输出 (`client_output_path`)**: 客户端本地的CSV文件路径，用于保存查询结果。如果查询的键在服务端数据库中存在，则返回对应的完整记录（或PIR方案配置返回的字段）。
    *   **执行**: 当 `spu.pir_query()` 被调用时（通常由客户端逻辑发起），隐语框架会协调客户端和服务端执行PIR协议。客户端将其查询（经过PIR特定的加密或编码）发送给服务端，服务端在其预处理数据上执行PIR运算，并将结果（也经过PIR特定的加密或编码）返回给客户端。客户端解密/解码后得到最终的查询结果。服务端在此过程中无法得知客户端查询的具体键值。

4.  **结果查看 (Client-Side)**:
    *   查询完成后，客户端（`applicant`）可以在其指定的 `client_output_path` 查看到查询结果。如果查询的专利ID存在，则结果文件中会包含该专利的详细信息。

整个流程使得客户端可以在不泄露查询意图的情况下，从服务端获取所需信息，有效保护了查询隐私。

---
#### 单元格 1: 环境准备与导入库
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方都需要执行)

```python
import secretflow as sf
import spu
import os

# 网络工具
import socket
from contextlib import closing
from typing import cast

# 用于查看结果 (申请方)
import pandas as pd

print(f"SecretFlow版本: {sf.__version__}")
print(f"SPU版本: {spu.__version__}")
```
**说明**: 导入基础库。

---
#### 单元格 2: 全局配置与常量定义
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方应保持这些配置一致)

```python
# 参与方定义
APPLICANT_PARTY_NAME = 'applicant'
SERVER_PARTY_NAME = 'server'

# 查询相关参数 (主要由申请方使用)
CLIENT_KEY_COLUMN = 'uid' # 申请方查询文件中的ID列名

# 文件路径 (假设数据文件已上传至各方工作目录或指定位置)
CURRENT_DIR = os.getcwd() # 各自获取自己的当前工作目录

# 服务端预处理数据和密钥路径 (服务端配置)
SERVER_SETUP_ARCHIVE = os.path.join(CURRENT_DIR, 'pir_server_setup.tar') # 服务端节点路径
SERVER_SETUP_DIR_NAME = 'pir_server_setup' # 解压后的目录名
SERVER_SETUP_PATH_ON_SERVER = os.path.join(CURRENT_DIR, SERVER_SETUP_DIR_NAME) # 服务端节点上解压后目录的完整路径
SERVER_SECRET_KEY_FILENAME = 'server_secret_key.bin'
SERVER_SECRET_KEY_DEST_PATH = os.path.join('/tmp', SERVER_SECRET_KEY_FILENAME) # 服务端密钥期望放置的路径

# 申请方查询文件和结果文件路径 (申请方配置)
APPLICANT_QUERY_FILE = os.path.join(CURRENT_DIR, 'pir_query.csv') # 申请方节点路径
APPLICANT_RESULT_FILE = os.path.join(CURRENT_DIR, 'pir_result.csv') # 申请方节点路径
```
**说明**: 定义参与方、查询参数、以及各方所需的文件路径。特别注意服务端密钥的约定路径。

---
#### 单元格 3: 工具函数 - 获取可用TCP端口
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方都需要此函数)

```python
def unused_tcp_port() -> int:
    """返回一个未被使用的TCP端口。"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return cast(int, sock.getsockname()[1])

print(f"获取到的一个可用端口: {unused_tcp_port()}")
```
**说明**: 用于为Ray Fed和SPU分配端口。

---
#### 单元格 4: SecretFlow 集群初始化 (Ray Fed)
**执行方**:
1.  **申请方 `applicant` 单独执行** (修改 `self_party`，并填入IP和端口)
2.  **服务方 `server` 单独执行** (修改 `self_party`，并填入IP和端口)

```python
# !!! 请各方根据实际获得的IP和动态端口替换下面的示例值 !!!
# 假设 applicant_actual_ip, applicant_ray_port 已经获取 (e.g., "172.16.0.252", 60261)
# 假设 server_actual_ip, server_ray_port 已经获取 (e.g., "172.16.0.1", 43097)

# --------- 申请方 applicant 节点执行此部分 -----------
current_party_for_init = APPLICANT_PARTY_NAME
applicant_actual_ip = "172.16.0.252"
applicant_ray_port = 60261 # unused_tcp_port()
server_actual_ip = "172.16.0.1"
server_ray_port = 43097 # unused_tcp_port()
# ----------------------------------------------------

# --------- 服务方 server 节点执行此部分 -------------
# current_party_for_init = SERVER_PARTY_NAME
# applicant_actual_ip = "172.16.0.252"
# applicant_ray_port = 60261 # unused_tcp_port()
# server_actual_ip = "172.16.0.1"
# server_ray_port = 43097 # unused_tcp_port()
# -------------------------------------------------


cluster_config_fed = {
    'parties': {
        APPLICANT_PARTY_NAME: {'address': f'{applicant_actual_ip}:{applicant_ray_port}', 'listen_addr': f'0.0.0.0:{applicant_ray_port}'},
        SERVER_PARTY_NAME: {'address': f'{server_actual_ip}:{server_ray_port}', 'listen_addr': f'0.0.0.0:{server_ray_port}'},
    },
    'self_party': current_party_for_init
}

if sf.is_initialized():
    sf.shutdown()
sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_fed, logging_level='INFO')
print(f"节点 {current_party_for_init} Ray Fed 初始化成功!")
```
**说明**: 初始化Ray Fed，连接申请方和服务方。

---
#### 单元格 5: SPU (Secure Processing Unit) 初始化
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方共同执行，配置需一致)

```python
# !!! 请各方根据实际获得的IP和动态SPU端口替换下面的示例值 !!!
# 假设 applicant_spu_port 已经获取 (e.g., 35785)
# 假设 server_spu_port 已经获取 (e.g., 40421)

# APPLICANT_SPU_PORT = 35785 # unused_tcp_port() on applicant
# SERVER_SPU_PORT = 40421 # unused_tcp_port() on server

spu_cluster_config = {
    'nodes': [
        {'party': APPLICANT_PARTY_NAME, 'address': f'{applicant_actual_ip}:{APPLICANT_SPU_PORT}'},
        {'party': SERVER_PARTY_NAME, 'address': f'{server_actual_ip}:{SERVER_SPU_PORT}'},
    ],
    'runtime_config': { # SPU基础配置
        'protocol': spu.spu_pb2.SEMI2K,
        'field': spu.spu_pb2.FM128,
    }
}

spu_instance = sf.SPU(
    cluster_def=spu_cluster_config,
    link_desc={'connect_retry_times': 60, 'connect_retry_interval_ms': 1000}
)
print("SPU 初始化成功!")
```
**说明**: 创建SPU设备实例。

---
#### 单元格 6: 服务端数据和密钥准备 (仅 Server 执行)
**执行方**: 服务提供方 `server`

**思考**:
服务端需要准备好PIR查询所需的数据。这包括：
1.  解压预处理数据包 `pir_server_setup.tar`。这个包里包含了经过PIR `setup` 命令处理后的数据库。
2.  将解压出来的服务端私钥文件 `server_secret_key.bin` 移动到PIR库期望的默认位置 `/tmp/`。

```python
import subprocess # 用于执行shell命令
import shutil     # 用于文件移动

# 此单元格仅由 SERVER_PARTY_NAME 执行
if current_party_for_init == SERVER_PARTY_NAME:
    print(f"服务方 {SERVER_PARTY_NAME} 正在准备PIR数据...")

    # 1. 解压 pir_server_setup.tar
    # 确保 SERVER_SETUP_ARCHIVE 文件存在于 SERVER_PARTY_NAME 的 CURRENT_DIR
    if os.path.exists(SERVER_SETUP_ARCHIVE):
        print(f"解压文件: {SERVER_SETUP_ARCHIVE} 到 {CURRENT_DIR}")
        try:
            # 使用 tar 命令解压。确保 tar 命令在环境中可用。
            # '!' 前缀在Jupyter Notebook中直接执行shell命令，但在普通Python脚本中需用subprocess
            # 对于 SecretNote, Notebook中的 '!' 通常可以直接使用
            subprocess.run(f"tar -xvf {SERVER_SETUP_ARCHIVE} -C {CURRENT_DIR}", shell=True, check=True)
            print(f"文件已解压到 {SERVER_SETUP_PATH_ON_SERVER}")

            # 2. 将 server_secret_key.bin 移动到 /tmp 目录下
            source_key_path = os.path.join(SERVER_SETUP_PATH_ON_SERVER, SERVER_SECRET_KEY_FILENAME) # 解压后的密钥路径
            if not os.path.exists(source_key_path): # 有些tar解压可能直接在当前目录
                 source_key_path = os.path.join(CURRENT_DIR, SERVER_SECRET_KEY_FILENAME)

            if os.path.exists(source_key_path):
                shutil.move(source_key_path, SERVER_SECRET_KEY_DEST_PATH)
                print(f"密钥文件 '{SERVER_SECRET_KEY_FILENAME}' 已移动到 '{SERVER_SECRET_KEY_DEST_PATH}'")
            else:
                print(f"错误: 未在解压路径 {source_key_path} 或 {CURRENT_DIR} 找到密钥文件 '{SERVER_SECRET_KEY_FILENAME}'。")
        except subprocess.CalledProcessError as e:
            print(f"解压文件时出错: {e}")
        except Exception as e:
            print(f"准备PIR数据时发生其他错误: {e}")
    else:
        print(f"错误: 服务端预处理数据归档文件 '{SERVER_SETUP_ARCHIVE}' 未找到。")
else:
    print(f"节点 {current_party_for_init} 不是服务方，跳过PIR数据准备。")
```
**说明**: 此单元格**仅由服务方 `server` 执行**。它负责解压预处理的数据库并正确放置密钥文件。如果这些步骤失败，PIR查询将无法进行。

---
#### 单元格 7: 执行PIR查询
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方共同执行，逻辑上由申请方发起)

**思考**:
`spu_instance.pir_query()` 是执行PIR的核心。
- `server`: 服务方名称。
- `client`: 申请方名称。
- `server_setup_path`: **必须是服务方节点上**预处理数据目录的正确路径。
- `client_key_columns`: 申请方查询文件（`pir_query.csv`）中包含要查询的ID的列名。
- `client_input_path`: 申请方本地的查询文件路径。
- `client_output_path`: 申请方本地用于保存查询结果的文件路径。

```python
# PIR查询由客户端发起，但需要服务端协作。
# 在SecretNote中，双方选中并执行此单元格，SPU会协调。

print("开始执行PIR查询...")
try:
    pir_query_result_meta = spu_instance.pir_query(
        server=SERVER_PARTY_NAME,
        client=APPLICANT_PARTY_NAME,
        server_setup_path=SERVER_SETUP_PATH_ON_SERVER, # 注意：这是服务端上的路径
        client_key_columns=[CLIENT_KEY_COLUMN], # 确保是列表
        client_input_path=APPLICANT_QUERY_FILE,   # 这是申请方上的路径
        client_output_path=APPLICANT_RESULT_FILE  # 这是申请方上的路径
    )
    print("PIR查询任务已提交或完成。")
    print(f"PIR查询元数据: {pir_query_result_meta}")
except Exception as e:
    print(f"执行PIR查询时出错: {e}")
    print("请确保服务方已成功完成数据和密钥准备步骤（单元格 6）。")
    print(f"同时检查服务端路径 '{SERVER_SETUP_PATH_ON_SERVER}' 是否正确且服务方可访问。")

"""
函数：spu.pir_query (这是SPUDevice的方法)
功能：执行PIR（Private Information Retrieval）查询。
参数：
    server (str): 服务提供方（数据持有方）的party名称。
    client (str): 客户端（查询方）的party名称。
    server_setup_path (str): 服务端上经过PIR预处理（setup）的数据目录路径。
    client_key_columns (List[str]): 客户端输入查询文件中用作查询键的列名列表。
    client_input_path (str): 客户端本地的输入查询文件路径（CSV格式）。
    client_output_path (str): 客户端本地的输出结果文件路径（CSV格式）。
    label_columns (List[str], optional): （高级）如果PIR方案支持标签PIR，指定标签列。
    label_hash_type (str, optional): （高级）标签哈希类型。
    op_type (str, optional): 操作类型，默认为 "OP_PIR_QUERY"。
返回：
    List[Dict]: 包含查询统计信息的列表，例如 [{'party': 'server', 'data_count': X}, {'party': 'applicant', 'data_count': Y}]
                 其中data_count的含义可能因PIR方案而异，通常指示处理/匹配的记录数。
"""
```
**说明**: 此单元格调用 `pir_query` 执行隐私查询。申请方提供查询ID列表，服务方根据预处理数据进行查询，并将结果（如果找到）返回给申请方，整个过程服务方不知道具体查询了哪些ID。`server_setup_path` 的正确性至关重要。

---
#### 单元格 8: 查看PIR查询结果 (在申请方)
**执行方**: 专利申请方 `applicant` (只有申请方能看到真实的查询结果)

```python
# 此单元格仅在申请方节点有意义查看真实内容
# 在SecretNote中，选中 applicant 节点执行此单元格

if current_party_for_init == APPLICANT_PARTY_NAME:
    print(f"申请方 {APPLICANT_PARTY_NAME} 正在检查PIR查询结果...")
    if os.path.exists(APPLICANT_RESULT_FILE) and os.path.getsize(APPLICANT_RESULT_FILE) > 0:
        try:
            pir_results_df = pd.read_csv(APPLICANT_RESULT_FILE)
            print(f"PIR查询结果 (存储在 '{APPLICANT_RESULT_FILE}'):")
            print(pir_results_df.head())
            print(f"查询到 {len(pir_results_df)} 条匹配记录。")
        except pd.errors.EmptyDataError:
             print(f"PIR结果文件 '{APPLICANT_RESULT_FILE}' 为空，可能查询的ID在服务端均未找到，或者PIR查询本身未成功返回数据。")
        except Exception as e:
            print(f"读取PIR结果文件时出错: {e}")
    else:
        # 如果 pir_query_result_meta 显示 applicant data_count > 0 但文件为空/不存在，则可能有问题
        # 但如果元数据也显示 data_count = 0，则说明确实没查到
        # 检查 pir_query_result_meta 中的 applicant data_count
        applicant_data_count = 0
        if 'pir_query_result_meta' in locals():
            for item in pir_query_result_meta:
                if item.get('party') == APPLICANT_PARTY_NAME:
                    applicant_data_count = item.get('data_count', 0)
                    break
        
        if applicant_data_count > 0:
            print(f"警告: PIR结果文件 '{APPLICANT_RESULT_FILE}' 未找到或为空，但元数据表明申请方应有数据。请检查PIR任务的详细日志。")
        else:
            print(f"PIR结果文件 '{APPLICANT_RESULT_FILE}' 未找到或为空。可能查询的ID均未在服务端找到，或者PIR查询未成功。")
else:
    print(f"节点 {current_party_for_init} 不是申请方，不查看PIR查询结果。")

```
**说明**: 申请方加载并查看 `pir_result.csv` 文件。该文件将包含其查询的ID中，在服务端数据库里存在的那些ID对应的完整记录。如果查询的ID服务端没有，则结果文件中不会有对应条目。

---
#### 单元格 9: 清理与关闭
**执行方**: 专利申请方 `applicant`, 服务提供方 `server` (双方共同执行)

```python
if 'spu_instance' in locals() and spu_instance:
    try:
        spu_instance.shutdown()
        print("SPU 设备已关闭。")
    except Exception as e:
        print(f"关闭SPU时出错: {e}")

if sf.is_initialized():
    sf.shutdown()
    print("SecretFlow 集群已关闭。")

print("实验资源清理完成。")
```
**说明**: 关闭SPU和Ray Fed集群。

好的，我们来整理第四个案例“诈骗电话识别 (纵向联邦 XGBoost 应用)”的实验报告。

---

### 案例4：诈骗电话识别 (纵向联邦 XGBoost 应用)

**实验背景：**
电信诈骗日益猖獗，给用户带来经济损失和不良体验。运营商A和运营商B各自掌握了用户的部分信息，如个人基本情况、套餐使用、上网行为、通话记录等。如果能够联合双方数据进行建模，有望更准确地识别诈骗电话。然而，由于数据隐私和合规要求，双方不能直接共享原始数据。纵向联邦学习为此提供了一个解决方案。

**实验目的**：

1.  理解纵向联邦学习 (Vertical Federated Learning, VFL) 的核心思想及其在保护数据隐私前提下进行多方联合建模的应用。
2.  掌握使用隐语 SecretFlow 平台配置和执行纵向联邦 XGBoost (SS-XGB) 任务的基本流程。
3.  学习在 SecretFlow 中加载 (`secretflow.data.vertical.read_csv`)、划分 (`secretflow.data.split.train_test_split`) 和预处理（特征删除、缺失值填充）纵向联邦数据 (VDataFrame)。
4.  构建并训练一个基于安全多方计算的纵向 XGBoost 模型 (`secretflow.ml.boost.ss_xgb_v.Xgb`)，理解其在训练过程中如何保护各方数据的隐私。

**实验设计思路与核心API分析：**

本实验旨在通过纵向联邦学习，联合运营商A（`alice`，持有部分特征和标签）和运营商B（`bob`，持有另一部分特征）的数据，训练一个XGBoost模型来识别诈骗电话。

1.  **环境初始化 (`sf.init`, `sf.SPU`, `sf.PYU`)**:
    *   `sf.init`: 初始化Ray Fed集群，连接`alice`和`bob`。
    *   `sf.SPU`: 创建SPU实例。纵向XGBoost在计算梯度、Hessian矩阵以及寻找最佳分裂点等步骤时，需要SPU提供的安全多方计算能力来保护中间值的隐私。
    *   `sf.PYU`: 为`alice`和`bob`创建PYU实例，代表各自的本地计算环境。

2.  **数据加载与准备 (`secretflow.data.vertical.read_csv`, `secretflow.data.split.train_test_split`)**:
    *   `secretflow.data.vertical.read_csv`: 从`alice`和`bob`各自的CSV文件加载数据，形成训练集和测试集的VDataFrame。在此类纵向场景中，数据通常已按样本ID对齐，或者需要提供对齐键。
    *   `secretflow.data.split.train_test_split`: 将加载的原始训练集VDataFrame划分为新的训练集和验证集，以便后续模型评估（尽管本案例脚本主要展示训练）。

3.  **特征工程 (VDataFrame上的操作)**:
    *   **特征删除 (`vdf.drop`)**: 根据业务理解或数据质量（如高缺失率）删除VDataFrame中的某些列。
    *   **缺失值填充 (`vdf.fillna`, `vdf.mode`)**:
        *   首先，识别含有缺失值的列 (`vdf.isna().sum()`)。
        *   然后，计算这些列的众数 (`vdf[na_cols].mode()`)。注意，`.mode()`可能返回多个众数，需要处理。
        *   最后，使用计算得到的众数填充VDataFrame中的缺失值 (`vdf.fillna(fill_values_dict)`)。所有这些操作都在VDataFrame上进行，保持数据分布在各方。

4.  **纵向XGBoost模型训练 (`secretflow.ml.boost.ss_xgb_v.Xgb`)**:
    *   **实例化模型**: `xgb_trainer = sf.ml.boost.ss_xgb_v.Xgb(spu_instance)`，将SPU设备传入。
    *   **定义参数 (`params`)**: 设置XGBoost模型的超参数，如树的数量 (`num_boost_round`)、最大深度 (`max_depth`)、学习目标 (`objective`)、正则化参数等。
    *   **准备训练数据**: 从预处理后的VDataFrame中分离出特征VDataFrame (`train_x`) 和标签VDataFrame Partition (`train_y`，标签由`alice`持有)。
    *   **训练 (`xgb_trainer.train`)**: 调用 `train` 方法，传入参数、特征数据和标签数据。训练过程中：
        *   持有标签方（`alice`）计算本地梯度和Hessian。
        *   各方基于本地特征寻找候选分裂点。
        *   通过SPU上的安全计算，汇总各方信息以确定全局最佳分裂点，而无需暴露各方的具体特征值或梯度信息。
        *   树的构建和模型参数的更新在多方协作下安全完成。

5.  **模型预测与评估 (本案例脚本未详述，但属完整流程)**:
    *   训练完成后，可以使用 `xgb_model.predict(test_x)` 进行预测。
    *   预测结果也是安全对象，需要 `sf.reveal` 后与真实标签比较，计算AUC等指标。

整个流程确保了运营商A和B的数据在不离开各自控制域的前提下，共同参与到一个更强大的模型训练中，从而提高了诈骗电话识别的准确性，同时符合数据隐私保护的要求。

---
#### 单元格 1: 环境准备与导入库
**执行方**: 运营商A `alice`, 运营商B `bob` (双方都需要执行)

```python
import secretflow as sf
import spu
import os

# 网络工具
import socket
from contextlib import closing
from typing import cast

# 数据处理与拆分
from secretflow.data.vertical import read_csv
from secretflow.data.split import train_test_split
from secretflow.ml.boost.ss_xgb_v import Xgb # 纵向XGBoost

# (可选) 用于本地查看数据或调试
import pandas as pd
import numpy as np

print(f"SecretFlow版本: {sf.__version__}")
print(f"SPU版本: {spu.__version__}")
```
**说明**: 导入所需库。

---
#### 单元格 2: 全局配置与常量定义
**执行方**: 运营商A `alice`, 运营商B `bob` (双方应保持这些配置一致)

```python
# 参与方定义
ALICE_PARTY_NAME = 'alice'
BOB_PARTY_NAME = 'bob'

# 标签列名 (由alice持有)
LABEL_COLUMN = 'label'

# 数据文件路径 (假设已上传至各方工作目录)
CURRENT_DIR = os.getcwd()
ALICE_TRAIN_FILE = os.path.join(CURRENT_DIR, 'train_a_label.csv')
BOB_TRAIN_FILE = os.path.join(CURRENT_DIR, 'train_b.csv')
ALICE_TEST_FILE = os.path.join(CURRENT_DIR, 'test_a.csv') # Alice测试集通常不含标签，用于盲测
BOB_TEST_FILE = os.path.join(CURRENT_DIR, 'test_b.csv')

# 特征工程: 要删除的列 (基于缺失率或业务判断)
COLS_TO_DROP = [
    "vip_lvl", "cmcc_pub_tl_typ_code", "belo_camp_id", "camp_lvl",
    "memb_typ", "gsm_user_lvl", "gsm_user_src", "last_one_stp_tm",
    "cancl_date", "exit_typ", "befo_pri_package_code", "rcn_chnl_id",
    "belo_group_cust_id", "rcn_chnl_typ", "term_brand", "basic_package_prc",
    "cm_nadd_mkcase_cnt", "cur_eff_sale_cmpn_cnt", "pretty_num_typ_name",
    "pretty_num_typ", "term_mdl", "stp_typ"
]

# XGBoost 模型参数
XGB_PARAMS = {
    'num_boost_round': 3,   # 树的棵树 (迭代次数)
    'max_depth': 3,         # 每棵树的最大深度
    'sketch_eps': 0.25,     # 用于分位数近似的参数
    'objective': 'logistic',# 学习目标：二分类逻辑回归
    'reg_lambda': 0.2,      # L2正则化系数
    'subsample': 0.1,       # 训练每棵树时样本的采样比例 (极低，演示用，实际应调高)
    'colsample_by_tree': 0.1,# 构建每棵树时特征的采样比例 (极低，演示用，实际应调高)
    'base_score': 0.5,      # 所有样本的初始预测分数
}
```
**说明**: 定义参与方、关键列名、待删除特征列表及XGBoost模型超参数。

---
#### 单元格 3: 工具函数 - 获取可用TCP端口
**执行方**: 运营商A `alice`, 运营商B `bob` (双方都需要此函数)

```python
def unused_tcp_port() -> int:
    """返回一个未被使用的TCP端口。"""
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("", 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return cast(int, sock.getsockname()[1])

print(f"获取到的一个可用端口: {unused_tcp_port()}")
```
**说明**: 用于为Ray Fed和SPU分配端口。

---
#### 单元格 4: SecretFlow 集群初始化 (Ray Fed)
**执行方**:
1.  **运营商A `alice` 单独执行** (修改 `self_party`，并填入IP和端口)
2.  **运营商B `bob` 单独执行** (修改 `self_party`，并填入IP和端口)

```python
# !!! 请各方根据实际获得的IP和动态端口替换下面的示例值 !!!
# 假设 alice_actual_ip, alice_ray_port 已经获取 (e.g., "172.16.0.9", 42427)
# 假设 bob_actual_ip, bob_ray_port 已经获取 (e.g., "172.16.0.6", 33089)

# --------- Alice 节点执行此部分 -----------
current_party_for_init = ALICE_PARTY_NAME
alice_actual_ip = "172.16.0.9"
alice_ray_port = 42427 # unused_tcp_port()
bob_actual_ip = "172.16.0.6"
bob_ray_port = 33089 # unused_tcp_port()
# --------------------------------------------

# --------- Bob 节点执行此部分 -----
# current_party_for_init = BOB_PARTY_NAME
# alice_actual_ip = "172.16.0.9"
# alice_ray_port = 42427 # unused_tcp_port()
# bob_actual_ip = "172.16.0.6"
# bob_ray_port = 33089 # unused_tcp_port()
# --------------------------------------------

cluster_config_fed = {
    'parties': {
        ALICE_PARTY_NAME: {'address': f'{alice_actual_ip}:{alice_ray_port}', 'listen_addr': f'0.0.0.0:{alice_ray_port}'},
        BOB_PARTY_NAME: {'address': f'{bob_actual_ip}:{bob_ray_port}', 'listen_addr': f'0.0.0.0:{bob_ray_port}'},
    },
    'self_party': current_party_for_init
}

if sf.is_initialized():
    sf.shutdown()
sf.init(address="127.0.0.1:6379", cluster_config=cluster_config_fed, logging_level='INFO')
print(f"节点 {current_party_for_init} Ray Fed 初始化成功!")
```
**说明**: 初始化Ray Fed，连接`alice`和`bob`。

---
#### 单元格 5: SPU 初始化 和 PYU 定义
**执行方**: 运营商A `alice`, 运营商B `bob` (双方共同执行，SPU配置需一致)

```python
# !!! 请各方根据实际获得的IP和动态SPU端口替换下面的示例值 !!!
# 假设 alice_spu_port 已经获取 (e.g., 37203)
# 假设 bob_spu_port 已经获取 (e.g., 51501)

# ALICE_SPU_PORT = 37203 # unused_tcp_port() on alice
# BOB_SPU_PORT = 51501 # unused_tcp_port() on bob

spu_cluster_config = {
    'nodes': [
        {'party': ALICE_PARTY_NAME, 'address': f'{alice_actual_ip}:{ALICE_SPU_PORT}'},
        {'party': BOB_PARTY_NAME, 'address': f'{bob_actual_ip}:{BOB_SPU_PORT}'},
    ],
    'runtime_config': {
        'protocol': spu.spu_pb2.SEMI2K,
        'field': spu.spu_pb2.FM128,
    }
}
spu_instance = sf.SPU(
    cluster_def=spu_cluster_config,
    link_desc={'connect_retry_times': 60, 'connect_retry_interval_ms': 1000}
)
print("SPU 初始化成功!")

# 定义PYU实例
alice_pyu = sf.PYU(ALICE_PARTY_NAME)
bob_pyu = sf.PYU(BOB_PARTY_NAME)
print(f"PYU实例创建: alice_pyu={alice_pyu}, bob_pyu={bob_pyu}")
```
**说明**: 创建SPU设备和各参与方的PYU逻辑设备。

---
#### 单元格 6: 加载纵向联邦数据集并划分
**执行方**: 运营商A `alice`, 运营商B `bob` (双方共同执行)

```python
# 加载原始训练集
train_path_dict = {alice_pyu: ALICE_TRAIN_FILE, bob_pyu: BOB_TRAIN_FILE}
vdf_train_raw = read_csv(train_path_dict) # 默认按样本顺序（索引）对齐
print(f"原始训练集加载完成。形状: {vdf_train_raw.shape}, 列: {vdf_train_raw.columns[:5]}...")

# (可选) 加载测试集，如果后续需要评估
# test_path_dict = {alice_pyu: ALICE_TEST_FILE, bob_pyu: BOB_TEST_FILE}
# vdf_test_raw = read_csv(test_path_dict)
# print(f"原始测试集加载完成。形状: {vdf_test_raw.shape}")

# 将原始训练集划分为新的训练集和验证集 (示例比例4:6，实际可调整)
vdf_train, vdf_valid = train_test_split(vdf_train_raw, train_size=0.4, random_state=123)
print(f"数据集划分完成。训练集形状: {vdf_train.shape}, 验证集形状: {vdf_valid.shape}")
```
**说明**: 加载数据并进行训练集/验证集划分。`read_csv`在纵向场景下若无`keys`参数，则假设数据已对齐。

---
#### 单元格 7: 特征工程 - 特征删除和缺失值填充
**执行方**: 运营商A `alice`, 运营商B `bob` (双方共同执行)

```python
# 1. 特征删除
vdf_train_dropped = vdf_train.drop(columns=COLS_TO_DROP, errors='ignore') # errors='ignore'避免列不存在时报错
vdf_valid_dropped = vdf_valid.drop(columns=COLS_TO_DROP, errors='ignore')
# vdf_test_dropped = vdf_test_raw.drop(columns=COLS_TO_DROP, errors='ignore') # 如果加载了测试集
print(f"特征删除后，训练集形状: {vdf_train_dropped.shape}")

# 2. 缺失值填充 (使用训练集的众数填充训练集和验证集)
na_counts_train = vdf_train_dropped.isna().sum()
na_cols_train = na_counts_train[na_counts_train > 0].index.tolist()
print(f"训练集中含缺失值的列: {na_cols_train}")

fill_values_dict = {}
if na_cols_train:
    # .mode() 返回一个VDataFrame，每列是该列的众数(可能多个)
    # 我们需要将其转换为一个字典 {col_name: fill_value}
    # fill_value应该是标量
    modes_vdf = vdf_train_dropped[na_cols_train].mode()
    # 将modes_vdf揭秘到一方（如alice）来构建字典，或在SPU上安全处理（更复杂）
    # 简单起见，如果数据不敏感或用于演示，可以揭秘。
    # 实际安全场景下，众数填充也可能需要安全计算。
    # 这里我们假设可以揭秘众数来构建填充字典 (不完全符合强隐私，但演示用)
    
    revealed_modes = {}
    for col in modes_vdf.columns:
        # modes_vdf[col] 是一个VDataFrame Partition
        # 其数据在持有该列的PYU上，或在SPU上（如果mode计算在SPU进行）
        # 我们需要获取这个值。假设mode()的结果可以在某一方（如alice）访问
        # 这是一个简化处理，实际SS-XGB的预处理可能更复杂或有内置方法
        try:
            # 尝试揭秘到alice，并取第一个众数
            # 注意：VDataFrame.mode()返回的是一个VDataFrame，其partition的device是原列的device。
            # 我们需要获取这些partition的数据。
            # 一个简化的做法（如果允许）：
            # modes_on_alice = sf.reveal(modes_vdf.to_pyu(alice_pyu)) # 转换为PYU上的DataFrame
            # for col_name in modes_on_alice.columns:
            #    fill_values_dict[col_name] = modes_on_alice[col_name].mode().iloc[0] # pandas Series.mode()
            # 上述方法对于VDataFrame的mode()可能不直接适用。
            # 一个更直接（但可能需要揭秘）的方法是，对每个partition单独处理：
            # for col_name in na_cols_train:
            #     # col_partition = vdf_train_dropped[col_name] # VDataFramePartition
            #     # mode_val_pyu = col_partition.mode().partitions[col_partition.devices[0]].data # PYUObject
            #     # fill_values_dict[col_name] = sf.reveal(mode_val_pyu)[0] # 取第一个
            # 这是一个复杂点，原脚本直接用了modes_vdf[col]作为字典值，可能依赖隐式转换或特定版本行为。
            # 为了演示，我们假设能拿到一个标量众数。
            # **重要简化：** 实际中，如果特征分布在多方，计算全局众数并用其填充是复杂的。
            # 此处我们用一个占位符，表示已通过某种方式获得填充值。
            # 原脚本的填充逻辑：na_mode = vdf_train_dropped[na_cols].mode()
            # for col in na_cols: fill_value_dict[col] = na_mode[col]
            # 这意味着 fill_value_dict 的值是 VDataFramePartition，fillna会处理这种情况。
            modes_vdf = vdf_train_dropped[na_cols_train].mode()
            for col_name in na_cols_train:
                 fill_values_dict[col_name] = modes_vdf[col_name] # 值为VDataFramePartition
            print(f"填充字典（值为VDF Partition）已创建，键: {list(fill_values_dict.keys())}")

        except Exception as e:
            print(f"计算或处理众数时出错: {e}")
            # 出错则不填充
            fill_values_dict = {}


    if fill_values_dict:
        vdf_train_filled = vdf_train_dropped.fillna(value=fill_values_dict)
        vdf_valid_filled = vdf_valid_dropped.fillna(value=fill_values_dict) # 用训练集的众数填充验证集
        # vdf_test_filled = vdf_test_dropped.fillna(value=fill_values_dict)
        print("缺失值填充完成。")
    else:
        print("未执行缺失值填充（无缺失值或计算众数失败）。")
        vdf_train_filled = vdf_train_dropped
        vdf_valid_filled = vdf_valid_dropped
        # vdf_test_filled = vdf_test_dropped
else:
    print("训练集中没有缺失值。")
    vdf_train_filled = vdf_train_dropped
    vdf_valid_filled = vdf_valid_dropped
    # vdf_test_filled = vdf_test_dropped

# 验证填充后是否还有缺失 (应为0)
print(f"填充后训练集缺失值总数: {sf.reveal(vdf_train_filled.isna().sum().sum())}") # .sum().sum() 计算总缺失数
```
**说明**: 执行特征删除和缺失值填充。缺失值填充的逻辑（特别是众数的计算和应用）在VDataFrame上比单机pandas要复杂，这里采用了原脚本的思路，即`fillna`的`value`参数可以接受一个值为VDataFrame Partition的字典。

---
#### 单元格 8: 纵向 XGBoost 模型训练
**执行方**: 运营商A `alice`, 运营商B `bob` (双方共同执行)

```python
# 1. 准备训练数据 (标签在alice方)
train_y = vdf_train_filled[LABEL_COLUMN]
train_x = vdf_train_filled.drop(columns=[LABEL_COLUMN])

print(f"训练特征X形状: {train_x.shape}, 训练标签Y形状: {train_y.shape}")
print(f"训练特征X列类型: {train_x.dtypes}") # 查看特征类型，确保都是数值型

# 2. 实例化并训练模型
xgb_trainer = Xgb(device_y=alice_pyu, spu=spu_instance) # device_y 指定标签持有方，spu实例
                                                        # 注意：最新版Xgb可能只需要spu，device_y会自动推断或不需要
                                                        # 查阅API，原脚本是 xgb = Xgb(spu)，我们遵循这个
xgb_trainer_final = Xgb(spu_instance)


print(f"开始训练纵向XGBoost模型...")
xgb_model = xgb_trainer_final.train(
    params=XGB_PARAMS,
    dtrain=train_x,
    label=train_y
)
print("纵向XGBoost模型训练完成。")

"""
类：secretflow.ml.boost.ss_xgb_v.Xgb
功能：基于安全多方计算的纵向联邦XGBoost模型训练器。
构造参数：
    spu (SPUDevice): 用于安全计算的SPU设备。
    (其他参数如 device_y 可能在不同版本中存在或已废弃，需查阅当前版本文档)

方法：train
功能：在输入的纵向特征数据和标签上训练XGBoost模型。
参数：
    params (dict): XGBoost的超参数字典。
    dtrain (VDataFrame): 包含训练特征的纵向联邦数据框。
    label (VDataFrame Partition): 包含训练标签的VDataFrame partition（单列）。
    (其他参数如 num_boost_round, evals 等，但num_boost_round已在params中)
返回：
    Booster: 训练好的XGBoost模型对象（具体类型可能为内部Booster或封装对象）。
"""
```
**说明**: 实例化 `Xgb` 训练器并调用 `train` 方法。`device_y` 参数（如果需要）显式指明了标签数据所在的PYU设备。训练过程会在SPU的保护下进行。原脚本直接用`Xgb(spu)`，这通常是正确的，因标签列的设备信息已在`label` VDataFrame Partition中。

---
#### 单元格 9: (可选) 模型预测与评估 - 概念性
**执行方**: 运营商A `alice`, 运营商B `bob` (共同执行预测), `alice` (执行评估)

```python
# 此部分为概念性演示，实际评估需要验证集标签
# valid_y = vdf_valid_filled[LABEL_COLUMN]
# valid_x = vdf_valid_filled.drop(columns=[LABEL_COLUMN])

# if 'xgb_model' in locals():
#     print("对验证集进行预测...")
#     y_pred_secure_valid = xgb_model.predict(valid_x)
    
#     # 揭秘预测结果和真实标签给alice进行评估
#     y_pred_revealed_valid = sf.reveal(y_pred_secure_valid.to_pyu(alice_pyu))
#     y_true_revealed_valid = sf.reveal(valid_y.partitions[alice_pyu].data)
    
#     # 转换为numpy array
#     # ... (类似案例1中的格式处理) ...

#     if current_party_for_init == ALICE_PARTY_NAME:
#         from sklearn.metrics import roc_auc_score
#         auc = roc_auc_score(y_true_revealed_valid_np_array, y_pred_revealed_valid_np_array)
#         print(f"模型在验证集上的AUC: {auc:.4f}")
# else:
#     print("模型未训练，跳过评估。")
```
**说明**: 展示了如何进行预测和评估（如果需要）。实际评估需要验证集标签，并且揭秘和计算AUC的步骤应在持有标签的`alice`方进行。

---
#### 单元格 10: 清理与关闭
**执行方**: 运营商A `alice`, 运营商B `bob` (双方共同执行)

```python
if 'spu_instance' in locals() and spu_instance:
    try:
        spu_instance.shutdown()
        print("SPU 设备已关闭。")
    except Exception as e:
        print(f"关闭SPU时出错: {e}")

if sf.is_initialized():
    sf.shutdown()
    print("SecretFlow 集群已关闭。")

print("实验资源清理完成。")
```
**说明**: 关闭SPU和Ray Fed集群。

---