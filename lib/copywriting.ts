// Literary reflections are not scientific claims or substitutes for references.
export type CopyPage = 'explore' | 'identity' | 'research' | 'sandbox';
type CopyCategory = 'philosophy' | 'love' | 'time' | 'family' | 'city' | 'nature' | 'daily' | 'technology' | 'evidence' | 'hope' | 'choices' | 'research' | 'humour' | 'interaction';
export type LiteraryCopy = { id: string; text: string; category: CopyCategory; page: CopyPage; scene: string; position: string; mood: string; keywords: string[]; priority: number; rotatable: boolean; kind: 'literary' };

type CopyGroup = { category: CopyCategory; page: CopyPage; scene: string; position: string; mood: string; keywords: string[]; lines: string[] };
const groups: CopyGroup[] = [
  { category:'philosophy', page:'explore', scene:'city', position:'introduction', mood:'reflective', keywords:['选择','城市'], lines:['一座城的轮廓，也由看不见的选择画成。','我们看见灯亮起，也可以追问光从哪里来。'] },
  { category:'love', page:'identity', scene:'shared-future', position:'reflection', mood:'warm', keywords:['陪伴','未来'], lines:['约好很久以后，也要给那时的四季留一点余地。','两个人谈论未来时，窗外的树也在场。'] },
  { category:'time', page:'explore', scene:'city', position:'reflection', mood:'reflective', keywords:['时间','累积'], lines:['一天的路很短，许多天会在地图上留下轨迹。','城市每天醒来，昨天用过的能量却不会倒回去。'] },
  { category:'family', page:'identity', scene:'shared-future', position:'reflection', mood:'warm', keywords:['家庭','代际'], lines:['给孩子留下的，不只有一本相册，还有相册外的季节。','餐桌上谈起明天，也可以想想明天的餐桌。'] },
  { category:'city', page:'explore', scene:'city', position:'reflection', mood:'observant', keywords:['城市','能源'], lines:['夜里的窗格各有故事，也各自需要一盏灯的能量。','道路连接街区，也让出行的选择彼此相遇。'] },
  { category:'nature', page:'sandbox', scene:'morning', position:'weather', mood:'hopeful', keywords:['清晨','自然'], lines:['晨光落在枝头，新的选择也从日常开始。','树影慢慢移动，生活的方向也可以调整。'] },
  { category:'daily', page:'sandbox', scene:'activity', position:'reflection', mood:'observant', keywords:['生活','消费'], lines:['杯子里的咖啡很近，它走过的路却值得多看一眼。','衣服穿在身上，材料与运输的故事还藏在身后。'] },
  { category:'technology', page:'identity', scene:'business', position:'reflection', mood:'thoughtful', keywords:['技术','能源'], lines:['让技术跑得更远，也要看清它脚下的能量。','一次计算带来答案，计算背后的用电同样值得记录。'] },
  { category:'evidence', page:'research', scene:'archive', position:'introduction', mood:'curious', keywords:['数据','边界'], lines:['数字有边界，理解从问清边界开始。','一张图表的线之外，还有它如何被画出来的故事。'] },
  { category:'hope', page:'sandbox', scene:'evening', position:'weather', mood:'hopeful', keywords:['改变','未来'], lines:['夕阳不是结论，明天仍有可以选择的路。','改变未必喧哗，有时从下一次开灯开始。'] },
  { category:'choices', page:'sandbox', scene:'breeze', position:'weather', mood:'reflective', keywords:['情景','选择'], lines:['风穿过树梢，一次选择也会牵动其他选择。','同一片树荫下，可以试着比较不同的明天。'] },
  { category:'research', page:'research', scene:'archive', position:'reflection', mood:'curious', keywords:['证据','求证'], lines:['好的问题会留下出处，让后来的人继续追问。','先听见证据，再决定如何讲述世界。'] },
  { category:'humour', page:'sandbox', scene:'activity', position:'reflection', mood:'light', keywords:['日常','用电'], lines:['电表不爱聊天，但很擅长记住我们忘关的灯。','出门前回头看一眼，有时不是舍不得，是空调还开着。'] },
  { category:'interaction', page:'sandbox', scene:'interaction', position:'feedback', mood:'inviting', keywords:['操作','情景'], lines:['换一种选择，再看看数字怎么回答。','先留下一个情景，再试另一条路。'] },
];

const additionalLines: string[][] = [
  ['选择不会因为足迹看不见，就没有走过。','城市会回答我们的需要，也会累积我们的习惯。','把问题放远一些，眼前的便利就多了一层含义。'],
  ['一起走过的街道，也值得让后来的人慢慢走。','想陪你看很多个冬天，也想让冬天仍有它的模样。','等一班车的时候，未来不必总是以赶路的速度经过。'],
  ['日历翻得很快，一座城市的改变却要经过许多页。','我们的日子按小时计算，留下的影响未必如此短暂。','每年同一扇窗外，季节都值得被认真辨认。'],
  ['祖辈留下地名，孩子还需要认识地名里的河。','家里那盏灯照着今天，也提醒我们思考电从哪里来。','故乡不是只存在于回忆里的地方，它还要供人生活。'],
  ['一栋楼的夜晚，藏着无数尚未下班的用电。','车窗外的灯连成线，每个路口都通往一种选择。','城市的尺度不只在天际线，也在一次平常的通勤里。'],
  ['花落在脚边，树仍在用自己的节奏迎接下一季。','河流绕过街道，提醒我们地图不是生活的全部。','一片树荫没有标价，却让夏日的路有了不同的走法。'],
  ['一件旧衣服继续被穿着，故事就不必在衣柜里结束。','购物车里装得下商品，也可以多装一个问题：是否需要。','午餐上桌之前，许多看不见的路已经走完。'],
  ['屏幕上的速度很快，供电的过程仍值得被看见。','更聪明的机器，也需要更清楚的能源账本。','技术可以改变城市，如何使用它仍由人作答。'],
  ['比较两个数字之前，先看看它们从哪里出发。','平均值讲述整体，也可能藏起不同的处境。','计算结果不是故事的句号，还要读它的假设。'],
  ['不必等一切准备完美，今天就能试一个更好的选择。','一条路能否走远，常常取决于愿意同行的人。','修复需要时间，而时间也容得下新的开始。'],
  ['把习惯放进情景里，才能看见不同选择如何展开。','改变一个输入，先观察结果，再讨论它意味着什么。','两种方案并排时，我们更容易问出下一道问题。'],
  ['出处不是装饰，它是通往原文的一条路。','承认暂时不知道，也是向答案走近的一步。','一条可靠的解释，应该经得起回头查找。'],
  ['冰箱门开得越久，挑选晚餐就越像一场能源会议。','快递盒不需要开口，也能让我们想起买下它的那一刻。','洗衣机很勤快，但不是每件衣服都要求它立刻出场。'],
  ['情景已换，看看哪些数字跟着改变。','打开文献，让这个答案有出处。','走近一点，看看城市里的下一段故事。'],
];

const furtherLines: string[][] = [
  ['看不见的排放，不会因为视线移开而消失。','我们习惯询问价格，也可以询问代价由谁承担。','便利到达门口以前，已经穿过许多人的世界。','一座城市如何运转，也回答着它想成为怎样的城市。','选择落在当下，影响却没有义务停在今天。'],
  ['你把围巾分我一半，我们沿着有树的街道回家。','我们约定下次见面，也给车站留了一个位置。','饭后一起收拾餐桌，是很小的事，也是共同生活。','我们记住初见时的花，也盼望它在往后的春天开放。','你说这条路适合散步，于是我们没有急着叫车。'],
  ['一年的电费装进账单，许多年的选择留在城市里。','长大以后才知道，习惯也会慢慢改变一条河的命运。','今天赶时间的人，也会在某个午后想找一片树荫。','季节没有按我们的日程表来，我们却能改变它面对的压力。','把一件物品用久一点，有时也是给时间多一个用途。'],
  ['父亲修好的椅子，又陪一家人吃过许多顿饭。','孩子问河水去了哪里，我们也该知道它从哪里来。','外婆记得旧时的雨，我们希望孩子也有自己的雨季。','把家留给下一代，也要想想家门外的空气。','故乡的路越修越宽，路边的树也值得有人照看。'],
  ['大楼里最后一人离开时，整层楼终于安静下来。','地铁把陌生人的方向暂时连在一起。','咖啡馆的暖意来自灯光，也来自背后的供能。','一条步行道的宽窄，决定了多少人愿意慢下来。','城市清晨的第一班车，比许多窗户醒得更早。'],
  ['树根在地下延伸，地上的街道也需要为它留出空间。','雨水落到屋顶之后，也需要一条回到河流的路。','蜜蜂经过花园，城市的边界没有拦住它。','草地接住一场雨，街道的夏天便多了一点柔软。','海岸线在地图上很细，在生活里却住着许多人。'],
  ['一杯咖啡喝完了，杯子还能不能再用一次？','手机更新得很快，旧设备里的材料却没有过期。','买菜时带上的袋子，下午还能装一束花。','一件衣服的寿命，不该只由下一次上新决定。','出门时关掉空调，让不在家的时间少一些用电。'],
  ['数据走过光纤之前，服务器需要电与冷却。','更快的算法值得庆祝，也值得计算它消耗的资源。','太阳落山后，电网还要回答灯光从哪里来。','一块电池让路程延长，材料的来路也进入了故事。','建筑会消耗能源，设计也可以让同一束日光走得更远。'],
  ['累计值像一本账，不能只看今天新写的一行。','比较排放时，单位和范围要先站在同一条线上。','一条趋势线能提示变化，不能独自解释原因。','不确定性不是数据的缺点，它提醒我们答案有多宽。','生命周期的起点，往往早于商品来到货架。'],
  ['有人种下一棵树，有人留下让它长大的空间。','改变不一定从宏大的承诺开始，也可以从共同的账本开始。','一次新的尝试未必完美，却能让下一次比较更清楚。','当更多人愿意同行，方便的选择也能慢慢改变。','把旧物修好的一刻，未来又多了一种可能。'],
  ['先改变出行方式，再看看情景里的用能如何变化。','两种方案使用同样的边界，比较才有意义。','把家庭人数调回原值，再观察这次改变的影响。','情景回答的是假设之下会怎样，而不是替明天作保证。','试着减少一次购买，看看结果和原方案相差多少。'],
  ['引用一份报告时，也要说清它研究的是哪一年。','不同研究的边界可能不同，分歧值得先被读懂。','一项结论背后有方法，也有它尚未回答的问题。','让数据可以追溯，是给下一位读者留门。','证据允许我们修正判断，而不必守住第一个答案。'],
  ['空房间的灯还亮着，看来它比我们更舍不得下班。','购物车没有脾气，少放一样它也不会生气。','水壶烧了满满一壶，而我只想喝半杯。','外卖备注可以很详细，点餐前看看分量也很有用。','衣柜说没有位置了，或许它想先举行一次旧衣重逢。'],
  ['展开来源，看看这条数据从哪里来。','切换时段，让同一片街景迎接不同的光。','选择角色，从另一种日常出发。','调整用量，再比较两个情景。','回到城市，继续寻找下一处细节。'],
];

const moreLines: string[][] = [
  ['城市的账本不只写着收入，也写着取用的资源。','看不见的代价，更需要有人耐心记录。','回答一个需要之前，先问问它从哪里来。','人能改变环境，因此也有能力重新审视改变。','我们留下的不只是答案，还有产生答案的方法。'],
  ['你等我下班，我等那班能一起回家的车。','两个人用同一盏灯读书，夜晚也有了陪伴。','一起修好旧桌子之后，晚饭有了新的话题。','我们计划着远行，也为沿途的风景留下余地。','窗台上的花长大了，我们约定明年还一起照看它。'],
  ['老照片里的街道，树比楼矮；如今树冠遮住了二楼。','一个习惯养成只要重复，改变它也需要重复。','一代人建起房屋，另一代人还要住在其中。','我们用一天走完一条路，路的建设却影响许多年。','一棵树的年轮，比一次消费的收据保存得更久。'],
  ['妈妈把菜叶洗净，窗外的雨正落进院子。','孩子长高的刻度旁，也有一棵树慢慢长高。','一家人搬进新房，也为未来的电费和用能做了选择。','家乡的水声留在记忆里，也该留在真实的河道里。','祖父修补过的东西，后来成了孩子认识他的方式。'],
  ['清晨的楼宇依次亮起，电网也开始迎接新一天。','城市为汽车留出道路，也需要为步行留出时间。','夜班结束时，街角的便利店还亮着灯。','一座楼的阴影落在街上，也影响街道的温度与使用。','公共空间的舒适，藏在座椅、树荫和到达它的路里。'],
  ['春天的叶子先在枝头出现，然后才进入人们的照片。','树荫下有人歇脚，风穿过时带走一点午后的热。','河面映着桥，桥下的水仍向自己的方向流去。','一场雨后，花坛里的土壤有了不同的颜色。','候鸟经过城市上空，季节并不只属于地面上的人。'],
  ['修补一颗纽扣，衣服就能再陪主人走一段路。','买回家的蔬菜被吃完，比被遗忘在冰箱里更好。','有些包装只陪伴商品一程，却要花更久处理。','分享一把工具，让它在不同的家里继续派上用场。','一盏灯照亮需要的地方，便不必照亮整间空屋。'],
  ['电从插座出来之前，经历过发电与输送。','一张地图可以显示路线，也可以帮助人们比较出行方式。','设备更新的时候，旧设备去向同样是一道技术问题。','让建筑读懂阳光，也要让使用它的人看得懂控制方式。','科技能帮助测量消耗，减少消耗还需要实际决定。'],
  ['总量和人均量回答不同问题，不能互相代替。','图表的纵轴从哪里开始，会影响我们看到的变化。','测量有时间和空间范围，结论也应带着这些范围。','把数据放回产生它的地方，才更容易理解差异。','两份账单的项目不同，合计之前先确认边界。'],
  ['一群人商量出来的改变，有机会走进更多人的日常。','新的路线先被一个人试走，后来成为许多人的选择。','让修理变得方便，是给物品第二次使用的机会。','一项改变被认真测量，下一次就更知道该往哪里走。','种下希望之后，还要给它浇水和时间。'],
  ['调整之前先记住原来的数字，变化才有比较的起点。','如果条件相同，两种选择的差异会更容易辨认。','情景里的未来可以重来，现实中的决定值得多想一步。','一个输入变了，结果也要连同假设一起阅读。','试完一种方式，再把另一种放到同一尺度下比较。'],
  ['读到结论时，也回头看看作者使用了什么方法。','同一个问题有不同答案，比较之前先看研究对象。','一份文献的日期，帮助我们理解它回答的是哪个时刻。','注明限制，是为后来补充证据留下位置。','研究不是替世界做最后总结，而是让问题更清楚。'],
  ['循环利用不是让盒子环游家里一圈就算完成。','准备午餐时想起冰箱的剩菜，它终于等到了主角时刻。','步行去附近的店，鞋底比停车位更先找到地方。','把闲置物送出去，柜子和下一位主人都松了一口气。','忘关的灯不需要加班，人在家时再请它上岗。'],
  ['打开图表，先看看坐标与单位。','选择另一种方案，比较结果。','进入档案，沿着出处继续阅读。','切换视角，留意街道里的细节。','保存这个情景，稍后再与新选择比较。'],
];

export const literaryCopy: LiteraryCopy[] = [...groups.flatMap((group, groupIndex) => [...group.lines, ...additionalLines[groupIndex], ...furtherLines[groupIndex], ...moreLines[groupIndex]].map((text, index) => ({
  id: `CT-${String(groupIndex * 50 + index + 1).padStart(3, '0')}`, text, category:group.category, page:group.page,
  scene:group.category === 'choices' && index >= 5 ? 'activity' : group.scene,
  position:group.category === 'choices' && index >= 5 ? 'reflection' : group.position,
  mood:group.mood, keywords:group.keywords, priority:1, rotatable:true, kind:'literary' as const,
}))), ...([
  ['CT-I-001', 'student', '一个好问题，可以从教室走到整座城市。'],
  ['CT-I-002', 'business', '把看不见的消耗记下来，决策才有另一种可能。'],
  ['CT-I-003', 'city', '规划一条街时，也在为许多人的日常画路。'],
] as const).map(([id, scene, text]) => ({ id, text, category:'philosophy' as const, page:'identity' as const, scene, position:'reflection', mood:'thoughtful', keywords:['身份','选择'], priority:1, rotatable:false, kind:'literary' as const }))];

export function selectLiteraryCopy(query: { page: CopyPage; scene?: string; position?: string; category?: CopyCategory }, previousId?: string, options?: { mode?: 'sequence' | 'random'; random?: () => number }): LiteraryCopy | undefined {
  const matches = literaryCopy.filter(item => item.page === query.page && (!query.scene || item.scene === query.scene) && (!query.position || item.position === query.position) && (!query.category || item.category === query.category));
  if (!matches.length) return undefined;
  if (options?.mode === 'random') {
    const rotatable = matches.filter(item => item.rotatable);
    const candidates = rotatable.length > 1 ? rotatable.filter(item => item.id !== previousId) : rotatable;
    if (!candidates.length) return undefined;
    const value = Math.max(0, Math.min(.999999, (options.random ?? Math.random)()));
    return candidates[Math.floor(value * candidates.length)];
  }
  const previous = matches.findIndex(item => item.id === previousId);
  return matches[(previous + 1) % matches.length];
}
