---
title: 普物二光学
published: 2024-12-18
description: 普物二总结，后续将搬迁到mkdocs上
tags: [note,links]
category: Unconcerned
draft: false
---
这部分尽量从简，参考虎哥+曹超slide+耶鲁教程混杂

## Chapter40 Geometrical Optics-1

### 40-1 Introduction

- 光学是研究光的性质及其在不同材料中的传播。
- 光学的传统应用，如望远镜和显微镜，以及现代应用，包括信息存储与检索、CD播放器、超市条形码和光纤通信。
- 几何光学的概念，即光在尺寸远大于波长的对象上的传播情况。
- 反射reflection、折射refraction、干涉interference、衍射diffraction和偏振polarization
- mirrors 反射镜，lenses 透镜，prisms 棱镜

电磁波(EM waves)在不同材料中的传播依赖折射率(index of refraction, n)。

- 光在介质中的速度(v)与真空中的速度(c)的关系:$v=cn$
- 折射率是频率依赖的(frequency dependent)。

:::note[Three Laws of Geometrical Optics (几何光学三定律)]

- **The law of straight line propagation of light**: 光在均匀介质(uniform material)中直线传播。
- **The Law of Reflection**: 反射光线(The reflected ray)位于入射平面(plane of incidence)内，且反射角($ \theta_r $)等于入射角($ \theta_i $)。
- **The law of Refraction**: 折射光线(The refracted ray)位于入射平面内，且满足 $ n_1 \sin\theta_1 = n_2 \sin\theta_2 $。

:::

Index of Refraction(折射率)
$$
c=\frac{1}{\sqrt{\mu_0\varepsilon _0}}
$$
在其他介质中

由于$\kappa _m\to 1,\kappa _e>1$
$$
v=\frac{1}{\sqrt {\kappa _e\kappa_m\varepsilon _0\mu_0}}=\frac{c}{\sqrt {\kappa_e}}
$$
有$v=\frac{c}{n}$其中$n\approx \sqrt {\kappa_e}>1$

注意折射率对于频率是独立的

$n_{{\color{blue}b},glass}=1.53,n_{{\color{red}r},glass}=1.52$

---

全反射
$$
\frac{\sin \theta _2}{\sin \theta _1}=\frac{n_1}{n_2}\Leftrightarrow \sin \theta \cdot n =K
$$
全反射发生-> $n_1>n_2$

$\sin \theta^*=\frac{n_2}{n_1}$

（Optical fiber）光纤内部都是全反射传递，Telecommunication/Laser surgery，记住$n_{out}<n_{in}$即可，因为永远都是密射疏被反射

---

色散

$\displaystyle n(\omega)=1+\frac{A}{(\omega _0^2-\omega ^2)}$

$n_{b}>b_{r}\to v_{b}<v_{r}$

蓝光频率大，角频率大，因此n大（这里要记清楚是定值减光频率）

:::note[eg prism]

![image-20241218104135805](/pic/phy2/image-20241218104135805.png)
$$
\sigma =(i_1+i_1')-(i_2+i_2') =(i_1+i_1')-\alpha\\
n=\frac{\sin \left(\frac{\alpha+\sigma_{\min}}{2}\right)}{\sin \frac{\alpha}{2}}
$$
折射率测量

:::



### 40-3 **Huygen’s** **Principle** 惠更斯原理

波前的每一点可以认为是产生球面次波的点波源，而以后任何时刻的波前则可看作是这些次波的包络。

当然这并没有解释光的单项传播

![image-20241218105030898](/pic/image-20241218105030898.png)

这就是一些波前的迭代生成过程，我们可以用惠更斯原理来导出反射和折射定理

![image-20241218105211351](/pic/image-20241218105211351.png)

### 40-4 Fermat's Principle 费马原理

光程（Optical Path）最短，$QP=\int n\cdot d l$
$$
\delta (QP)=0
$$
一束光线从一个固定点传播到另一个固定点，其路径的选择使得与附近的路径相比，所需的时间要么是最小的，要么是最大的，或者保持不变（即为静止）。

也可以导出反射和折射定理

![image-20241218105634540](/pic/image-20241218105634540.png)

### 40-5 Image Formation 成像问题

这里我们区分实象和虚像

实像

- 真实物体出来的光路的汇聚处
- 到物体的光路的汇聚处

虚像

- 真实物体光路的反向延长线汇聚处
- 到物体的光路的反向延长线的汇聚处

还有平面镜像

像之间具有等光程性

Object side and Image Side，物方和像方

---

:::note[eg 球面镜(Spherical Mirror)成像]

![image-20241218110149042](/pic/image-20241218110149042.png)

只有两种情况能够被设过去，左侧为0，且右侧为0

同时确定，只有一组，齐明点

另一种是傍轴金斯，$h^2<<i^2,r^2,o^2$

:::

----

成像公式

first focal $i\to \infty o=f=\frac{n}{n'-n}r$

second focal $o\to \infty ,i=f'=\frac{n'}{n'-n}r$

之前的情况一，$\frac{n'}{i}+\frac{n}{o}=\frac{n'-n}{r}$

$\frac{f}{o}+\frac{f'}{i}=1$

基于上述约定

![image-20241218110639867](/pic/image-20241218110639867.png)

反射成像需要重新定义下

![image-20241218110733183](/pic/image-20241218110733183.png)

接下来对于傍轴物点成像有一个横向放大率的概念

![image-20241218110933382](/pic/image-20241218110933382.png)

**Image Formation of Compound Optical System**

这个就很复杂了，需要的话自己看去吧

对于薄透镜，我们可能需要考虑多个折射面的复合

反正结论就是

![image-20241218111147434](/pic/image-20241218111147434.png)

其中较为重要的是右侧，实际上我们可以总结出更优美的形式，当$n=n'=1\to f=f'$

有
$$
f=f'=\frac{1}{(n_L-1)(\frac{1}{r_1}-\frac{1}{r_2})}
$$


$f,f'>0$凸 Converging 透镜，$f,f'<0$凹.Diverging 透镜

考虑成真实物体

![image-20241218111510728](/pic/image-20241218111510728.png)

这里要注意$n=n'$是真实情况下我们最常用的公式$\frac{1}{o}+\frac{1}{i}=\frac{1}{f}$

横向放大倍数**Lateral Magnification** 

- 屈光度 Diopter

![image-20241218111724789](/pic/image-20241218111724789.png)

### 40-6 奇特的知识

眼睛 candle from 12miles=19.312公里 

![image-20241218111831303](/pic/image-20241218111831303.png)

$f_{tense}=22.7mm,f_{relax}=25mm$

近视眼

![image-20241218111951681](/pic/image-20241218111951681.png)

裸眼和戴眼镜的差异，角度差异，后面可以看一下

## Chapter41 Interfere

这一节我看的中文版，晚点再补

首先我们需要理解几何光学解决$\lambda << d$的问题，波动光学解决$\lambda \approx d$的问题

光矢量就是光波中的点振动矢量$\vec E$
$$
E=E_0\cos (\omega t+\varphi_1-2\pi \frac{x}{\lambda})
$$
叠加$\omega _1=\omega_2=\omega $
$$
E=E_1+E_2=E_0\cos(\omega t+\varphi_0)
I_0=E_0^2=I_1+I_2+2\sqrt{I_1I_2}\cos \Delta \varphi
$$
干涉光强分布,$I_1=I_2\Rightarrow 4I_1\cos \Delta \frac{\varphi}{2}$

干涉条件，频率同，振动方向同，相位差恒定，$\Delta \varphi =\pm 2k\pi$干涉加强，奇数时干涉减弱

获取相干（频率同）光的方式：

- 分波面
- 分振幅

光程差来表示

## Chapter 42 Diffraction
