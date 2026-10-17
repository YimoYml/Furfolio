<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
const root = ref<HTMLElement>()
let context: gsap.Context | undefined
onMounted(() => {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    context = gsap.context(() => gsap.from('.home-enter', { y: 22, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out' }), root.value)
})
onBeforeUnmount(() => context?.revert())
</script>
<template>
  <main ref="root" class="home-page">
    <section class="home-hero">
      <div class="home-hero-copy">
        <p class="home-kicker home-enter">一个属于你的地方。</p>
        <h1 class="home-enter">把你的角色，<br />带到<span class="ink-underline">网上。</span></h1>
        <p class="home-description home-enter">你负责表达自己。<br />我们把排版、配色与那些小细节，准备好。</p>
        <div class="home-actions home-enter"><RouterLink to="/templates" class="button button-dark">找到我的风格 <span>↗</span></RouterLink><RouterLink to="/preview?sample=1" class="text-link">先看看示例 →</RouterLink></div>
        <p class="home-footnote home-enter">先设计，后注册。现在就可以开始。</p>
      </div>
      <RouterLink to="/preview?sample=1" class="home-cover home-enter" aria-label="查看 A 的示例主页">
        <span class="cover-label">Y2K COLLAGE / 示例主页 <span>↗</span></span>
        <span class="cover-che">CHE</span>
        <img src="/demo/che-cutout.png" alt="示例角色澈，素材仅用于演示" />
        <span class="cover-copy">把日常，<br />过成自己的颜色。</span>
        <span class="cover-paper">澈 / CHE <span>打开他的世界 ↗</span></span>
      </RouterLink>
    </section>
    <section class="home-styles">
      <div class="section-intro"><h2>你的风格，<br />不止一种。</h2><p>从拼贴到杂志，选择不同的设计语言。<br />资料始终属于你，风格可以慢慢找到。</p><RouterLink to="/templates" class="text-link">浏览风格 →</RouterLink></div>
      <div class="style-pair">
        <RouterLink to="/templates" class="mini-style mini-y2k"><span>Y2K COLLAGE</span><strong>MAKE<br />IT YOURS.</strong><small>活泼、鲜明、有点不按常理。</small><span class="mini-arrow">↗</span></RouterLink>
        <RouterLink to="/templates" class="mini-style mini-editorial"><span>PAPER & INK</span><strong>Your own<br /><em>little world.</em></strong><small>留下一页，慢慢讲你的故事。</small><span class="mini-arrow">↗</span></RouterLink>
      </div>
    </section>
    <section class="home-process"><h2>从一个想法，<br />到你的主页。</h2><div><p><span>选一个喜欢的风格</span>选择颜色，也选择表达自己的方式。</p><p><span>放进真实的你</span>上传自己的图片，写下介绍和喜欢的事。</p><p><span>看看它的样子</span>桌面和手机，都有适合的阅读节奏。</p></div></section>
    <section class="home-final"><p>不需要会写代码。</p><h2>只需要，<br />成为你自己。</h2><RouterLink to="/editor" class="button button-dark">开始我的主页 ↗</RouterLink><small>发布后，用专属链接分享。</small></section>
    <section class="home-showcase" aria-labelledby="home-showcase-title"><div><p>作品广场</p><h2 id="home-showcase-title">看看大家，<br />如何介绍自己。</h2><p class="home-showcase-description">来自社区的主页，都有各自的颜色。</p><RouterLink to="/showcase" class="button button-light">进入作品广场 <span aria-hidden="true">↗</span></RouterLink></div><div class="showcase-colors" aria-hidden="true"><i></i><i></i><i></i></div></section>
    <footer class="site-footer"><span class="brand">FURFOLIO.</span><span>FOR EVERY KIND OF YOU.</span><RouterLink to="/templates">从你的风格开始 ↗</RouterLink></footer>
  </main>
</template>
