---
name: remove-beast-trap-pathfind-penalty
overview: 移除巨兽寻路时对陷阱的+10代价惩罚，使陷阱对巨兽的移动代价与普通平地相同，巨兽不会因陷阱而改变路线。
todos:
  - id: remove-trap-cost
    content: 移除 gameEngine.js getMoveCost 中巨兽陷阱代价+10惩罚
    status: completed
---

将巨兽在陷阱格子上的寻路代价改为与普通平地相同（cost=1），使陷阱放置后巨兽不会因额外代价而绕路改变路线。陷阱踩上去后的眩晕效果保留不变，仅寻路阶段不再避开陷阱。

修改 `gameEngine.js` 的 `getMoveCost` 方法（第1354-1360行），移除巨兽在陷阱格子上的 `cost += 10` 惩罚。`game.js` 无独立 `getMoveCost` 覆写，继承父类逻辑，无需额外修改。

具体变更：删除 `if (trapHere) cost += 10;` 这一判断，或将整个巨兽陷阱代价块简化为不再加价。这样陷阱格子代价等于基础 cost（通常为1，等同于平地 LAND），A* 寻路算法不会因陷阱而改变巨兽路径。