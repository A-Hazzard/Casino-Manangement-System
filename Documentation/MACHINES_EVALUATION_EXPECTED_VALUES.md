# Machines Evaluation Tab - Expected Values Guide

## Test Data Setup

**IMPORTANT:** This script will:

1. **Clear ALL manufacturer and game data from ALL machines** in the database
2. Set test data on **8 machines** in the Cabana licensee
3. Assign exactly **5 manufacturers** and **5 games** to these machines

**KEY POINT:** The charts will show **exactly 5 manufacturers** and **exactly 5 games** (no more, no less). While 8 machines are used for testing, they are distributed across only 5 manufacturers and 5 games.

After running `node scripts/update-test-machines-data.js`, **8 test machines** will be created with manufacturer and game data, distributed as follows:

**Note:** These 8 machines are distributed across exactly **5 manufacturers** (A, B, C, D, E) and **5 games** (Game1, Game2, Game3, Game4, Game5). The charts will show only these 5 manufacturers and 5 games.

### Machine Distribution (8 Test Machines)

| Machine # | Manufacturer   | Game  | Handle  | Win    | Games | Jackpot |
| --------- | -------------- | ----- | ------- | ------ | ----- | ------- |
| 1         | Manufacturer A | Game1 | $10,000 | $500   | 1,000 | $0      |
| 2         | Manufacturer A | Game2 | $5,000  | $250   | 500   | $0      |
| 3         | Manufacturer B | Game3 | $3,000  | $90    | 300   | $0      |
| 4         | Manufacturer B | Game4 | $8,000  | $160   | 2,000 | $0      |
| 5         | Manufacturer C | Game5 | $15,000 | $1,000 | 1,500 | $500    |
| 6         | Manufacturer C | Game1 | $20,000 | $1,200 | 2,000 | $0      |
| 7         | Manufacturer D | Game2 | $4,000  | $200   | 200   | $0      |
| 8         | Manufacturer E | Game3 | $12,000 | $800   | 1,200 | $200    |

### Totals Across All 8 Test Machines

- **Total Handle**: $77,000
- **Total Win**: $4,200
- **Total Games Played**: 8,700
- **Total Drop**: $4,200
- **Total Gross**: $4,200
- **Total Cancelled Credits**: $0
- **Total Jackpot**: $700

**Note:** These totals represent the aggregate of all 8 test machines, which are distributed across 5 manufacturers and 5 games.

---

## 1. Summary Section

### Expected Values

- **Handle Contribution**: **100.0%**
- **Win Contribution**: **100.0%**
- **Games Played Contribution**: **100.0%**

### Why 100%?

**High-Level Explanation:**

The Summary section shows: **"What percentage do the machines in your CURRENT VIEW contribute to their own totals?"**

**Key Point:** The Summary calculates the contribution of the **filtered/visible machines** to the **total of those same filtered machines**. This is why it always shows 100% when viewing all machines.

**The Formula (Calc. 3):**

```
Contribution % = (Filtered Machines' Total / Filtered Machines' Total) × 100
```

**Why This Makes Sense:**

- When you view **all 8 test machines**, they collectively generate $77,000 handle
- Those same 8 machines contribute **100%** to that $77,000 total (because they ARE the total)
- The calculation: `($77,000 / $77,000) × 100 = 100%`

**What This Means:**

- **100% Handle Contribution** = All visible machines contribute 100% to the total handle of visible machines
- **100% Win Contribution** = All visible machines contribute 100% to the total win of visible machines
- **100% Games Contribution** = All visible machines contribute 100% to the total games played by visible machines

**Real-World Analogy:**

- If you have a pizza with 8 slices and you're looking at all 8 slices, those 8 slices make up 100% of the pizza
- If you filter to only 4 slices, those 4 slices would show 100% of the filtered pizza (not 50% of the original pizza)

**Note:** This is different from the Manufacturer/Game charts, which show how each manufacturer/game contributes relative to each other (e.g., Manufacturer A has 19.5% of total handle, Manufacturer C has 45.5%, etc.).

---

## 2. Manufacturer Performance Chart

**IMPORTANT:** After running the script, you should see **exactly 5 manufacturers** in this chart:

- Manufacturer A
- Manufacturer B
- Manufacturer C
- Manufacturer D
- Manufacturer E

All other manufacturers will be cleared from the database.

### Expected Values by Manufacturer

#### Manufacturer A (2 machines: #1, #2)

- **Floor Positions**: 25.0% (2 machines out of all test machines)
- **Total Handle**: 19.5% ($15,000 / $77,000)
- **Total Win**: 17.9% ($750 / $4,200)
- **Total Drop**: 17.9% ($750 / $4,200)
- **Total Gross**: 17.9% ($750 / $4,200)
- **Total Canc. Cr.**: 0% ($0 / $0)
- **Total Games Played**: 17.2% (1,500 / 8,700)

**Manufacturer A Totals:**

- Handle: $10,000 + $5,000 = $15,000
- Win: $500 + $250 = $750
- Games: 1,000 + 500 = 1,500

#### Manufacturer B (2 machines: #3, #4)

- **Floor Positions**: 25.0% (2 out of 8 test machines)
- **Total Handle**: 14.3% ($11,000 / $77,000)
- **Total Win**: 6.0% ($250 / $4,200)
- **Total Drop**: 6.0% ($250 / $4,200)
- **Total Gross**: 6.0% ($250 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 26.4% (2,300 / 8,700)

**Manufacturer B Totals:**

- Handle: $3,000 + $8,000 = $11,000
- Win: $90 + $160 = $250
- Games: 300 + 2,000 = 2,300

#### Manufacturer C (2 machines: #5, #6)

- **Floor Positions**: 25.0% (2 out of 8 test machines)
- **Total Handle**: 45.5% ($35,000 / $77,000)
- **Total Win**: 52.4% ($2,200 / $4,200)
- **Total Drop**: 52.4% ($2,200 / $4,200)
- **Total Gross**: 52.4% ($2,200 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 40.2% (3,500 / 8,700)

**Manufacturer C Totals:**

- Handle: $15,000 + $20,000 = $35,000
- Win: $1,000 + $1,200 = $2,200
- Games: 1,500 + 2,000 = 3,500

#### Manufacturer D (1 machine: #7)

- **Floor Positions**: 12.5% (1 out of 8 test machines)
- **Total Handle**: 5.2% ($4,000 / $77,000)
- **Total Win**: 4.8% ($200 / $4,200)
- **Total Drop**: 4.8% ($200 / $4,200)
- **Total Gross**: 4.8% ($200 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 2.3% (200 / 8,700)

#### Manufacturer E (1 machine: #8)

- **Floor Positions**: 12.5% (1 out of 8 test machines)
- **Total Handle**: 15.6% ($12,000 / $77,000)
- **Total Win**: 19.0% ($800 / $4,200)
- **Total Drop**: 19.0% ($800 / $4,200)
- **Total Gross**: 19.0% ($800 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 13.8% (1,200 / 8,700)

### Why These Calculations?

**High-Level Explanation:**

The chart shows: "Out of ALL machines, what percentage does each manufacturer contribute?"

**The Formula (Calc. 3):**

```
Manufacturer Contribution % = (Manufacturer's Total / All Machines' Total) × 100
```

**Example - Manufacturer A Handle:**

- Manufacturer A has 2 machines with $15,000 total handle
- All test machines have $77,000 total handle
- Calculation: ($15,000 / $77,000) × 100 = 19.5%

**Real-World Analogy:**

- If you have test machines distributed across 5 manufacturers, and 2 are from "Manufacturer A", Manufacturer A has 25% of the machines (Floor Positions)
- If those 2 machines generated $15,000 out of $77,000 total, Manufacturer A contributed 19.5% of the total handle

**Key Insight:**

- Floor Positions % = How many machines (count)
- Handle/Win/Games % = How much money/activity (value)
- These can be different! Manufacturer C has 25% of machines but 45.5% of handle because their machines are higher performers.

---

## 3. Game Performance Chart

**IMPORTANT:** After running the script, you should see **exactly 5 games** in this chart:

- Game1
- Game2
- Game3
- Game4
- Game5

All other games will be cleared from the database.

### Expected Values by Game

#### Game1 (2 machines: #1, #6)

- **Floor Positions**: 25.0% (2 out of 8 test machines)
- **Total Handle**: 39.0% ($30,000 / $77,000)
- **Total Win**: 40.5% ($1,700 / $4,200)
- **Total Drop**: 40.5% ($1,700 / $4,200)
- **Total Gross**: 40.5% ($1,700 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 34.5% (3,000 / 8,700)

**Game1 Totals:**

- Handle: $10,000 + $20,000 = $30,000
- Win: $500 + $1,200 = $1,700
- Games: 1,000 + 2,000 = 3,000

#### Game2 (2 machines: #2, #7)

- **Floor Positions**: 25.0% (2 out of 8 test machines)
- **Total Handle**: 11.7% ($9,000 / $77,000)
- **Total Win**: 10.7% ($450 / $4,200)
- **Total Drop**: 10.7% ($450 / $4,200)
- **Total Gross**: 10.7% ($450 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 8.0% (700 / 8,700)

**Game2 Totals:**

- Handle: $5,000 + $4,000 = $9,000
- Win: $250 + $200 = $450
- Games: 500 + 200 = 700

#### Game3 (2 machines: #3, #8)

- **Floor Positions**: 25.0% (2 out of 8 test machines)
- **Total Handle**: 19.5% ($15,000 / $77,000)
- **Total Win**: 21.2% ($890 / $4,200)
- **Total Drop**: 21.2% ($890 / $4,200)
- **Total Gross**: 21.2% ($890 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 17.2% (1,500 / 8,700)

**Game3 Totals:**

- Handle: $3,000 + $12,000 = $15,000
- Win: $90 + $800 = $890
- Games: 300 + 1,200 = 1,500

#### Game4 (1 machine: #4)

- **Floor Positions**: 12.5% (1 out of 8 test machines)
- **Total Handle**: 10.4% ($8,000 / $77,000)
- **Total Win**: 3.8% ($160 / $4,200)
- **Total Drop**: 3.8% ($160 / $4,200)
- **Total Gross**: 3.8% ($160 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 23.0% (2,000 / 8,700)

#### Game5 (1 machine: #5)

- **Floor Positions**: 12.5% (1 out of 8 test machines)
- **Total Handle**: 19.5% ($15,000 / $77,000)
- **Total Win**: 23.8% ($1,000 / $4,200)
- **Total Drop**: 23.8% ($1,000 / $4,200)
- **Total Gross**: 23.8% ($1,000 / $4,200)
- **Total Canc. Cr.**: 0%
- **Total Games Played**: 17.2% (1,500 / 8,700)

### Why These Calculations?

**High-Level Explanation:**

Same concept as Manufacturer chart, but grouped by **game** instead of manufacturer.

**The Formula (Calc. 3):**

```
Game Contribution % = (Game's Total / All Games' Total) × 100
```

**Example - Game1 Handle:**

- Game1 has 2 machines with $30,000 total handle
- All test machines have $77,000 total handle
- Calculation: ($30,000 / $77,000) × 100 = 39.0%

**Key Insight:**

- Game4 has only 1 machine (12.5% floor positions) but that machine plays a LOT of games (2,000), so Game4 has 23.0% of total games played!
- This shows that one machine can contribute significantly to games played even if it represents a small portion of total machines.

---

## 4. Games Performance Revenue Chart

### Expected Values

This chart shows revenue (Gross) by game. Based on our test data:

- **Game1**: $1,700 (40.5% of total gross)
- **Game2**: $450 (10.7% of total gross)
- **Game3**: $890 (21.2% of total gross)
- **Game4**: $160 (3.8% of total gross)
- **Game5**: $1,000 (23.8% of total gross)

**Total Gross**: $4,200

### Why This Chart?

**High-Level Explanation:**

This chart shows which games are making the most money. It's similar to the Game Performance chart but focuses specifically on revenue (gross profit).

**Real-World Analogy:**

- Like a sales report showing which products generate the most revenue
- Game1 and Game5 are your top revenue generators
- Game4 generates the least revenue despite having high game play

---

## 5. Top Machines Table

### Expected Top 5 Machines (Sorted by Net Win, Descending)

1. **Machine 6** (Manufacturer C, Game1)
   - Handle: $20,000
   - Average Wager: $10.00 (20,000 ÷ 2,000)
   - Win: $1,200
   - Jackpot: $0
   - Theoretical Hold: 5.00%
   - Actual Hold: 6.00% ((20,000 - 18,800) ÷ 20,000 × 100)
   - Games Played: 2,000

2. **Machine 5** (Manufacturer C, Game5)
   - Handle: $15,000
   - Average Wager: $10.00 (15,000 ÷ 1,500)
   - Win: $1,000
   - Jackpot: $500
   - Theoretical Hold: 5.00%
   - Actual Hold: 6.67% ((15,000 - 14,000) ÷ 15,000 × 100)
   - Games Played: 1,500

3. **Machine 8** (Manufacturer E, Game3)
   - Handle: $12,000
   - Average Wager: $10.00 (12,000 ÷ 1,200)
   - Win: $800
   - Jackpot: $200
   - Theoretical Hold: 5.00%
   - Actual Hold: 6.67% ((12,000 - 11,200) ÷ 12,000 × 100)
   - Games Played: 1,200

4. **Machine 1** (Manufacturer A, Game1)
   - Handle: $10,000
   - Average Wager: $10.00 (10,000 ÷ 1,000)
   - Win: $500
   - Jackpot: $0
   - Theoretical Hold: 5.00%
   - Actual Hold: 5.00% ((10,000 - 9,500) ÷ 10,000 × 100)
   - Games Played: 1,000

5. **Machine 4** (Manufacturer B, Game4)
   - Handle: $8,000
   - Average Wager: $4.00 (8,000 ÷ 2,000)
   - Win: $160
   - Jackpot: $0
   - Theoretical Hold: 5.00%
   - Actual Hold: 2.00% ((8,000 - 7,840) ÷ 8,000 × 100)
   - Games Played: 2,000

### Why These Calculations?

**High-Level Explanation:**

#### Average Wager (Calc. 1)

**Formula:** `Average Wager = Handle ÷ Games Played`

**What it means:** How much money is bet per game on average.

**Example - Machine 6:**

- Players bet $20,000 total across 2,000 games
- Average bet per game: $20,000 ÷ 2,000 = $10.00

**Real-World Analogy:** If you spent $100 on 10 items, your average cost per item is $10.

#### Actual Hold (Calc. 2)

**Formula:** `Actual Hold = ((Coin In - Coin Out) ÷ Coin In) × 100`

**What it means:** What percentage of money bet did the casino keep?

**Example - Machine 6:**

- Players bet $20,000 (Coin In)
- Players won back $18,800 (Coin Out)
- Casino kept: $20,000 - $18,800 = $1,200
- Hold percentage: ($1,200 ÷ $20,000) × 100 = 6.00%

**Real-World Analogy:**

- If a store buys items for $100 and sells them for $94, they kept $6 (6% profit margin)
- Higher hold = casino makes more money per dollar bet

#### Theoretical Hold

**Formula:** `Theoretical Hold = (1 - theoreticalRtp) × 100`

**What it means:** What the game is SUPPOSED to hold based on its design.

**Example:**

- Theoretical RTP (Return to Player) = 95%
- Theoretical Hold = (1 - 0.95) × 100 = 5.00%

**Real-World Analogy:**

- Like a product's expected profit margin
- If actual hold is higher than theoretical, the machine is performing better than expected

---

## Summary of Key Concepts

### Contribution Percentage (Calc. 3)

**Formula:** `(Part / Whole) × 100`

**What it answers:** "What percentage does this group contribute to the total?"

**Example:** If Manufacturer A has $15,000 out of $77,000 total, they contribute 19.5%

### Why Percentages Matter

1. **Floor Positions %**: Shows distribution of machines (count)
2. **Handle/Win/Games %**: Shows distribution of activity/value (performance)
3. **These can differ!** A manufacturer with 25% of machines might have 45% of handle if their machines perform better

### The Big Picture

- **Summary**: Shows all test machines contribute 100% (you're looking at all of them)
- **Manufacturer Chart**: Shows exactly **5 manufacturers** and which are most important (by count and performance)
- **Game Chart**: Shows exactly **5 games** and which are most popular/profitable
- **Top Machines**: Shows individual machine performance rankings

**Remember:** Only 5 manufacturers and 5 games will appear in the charts, even though 8 machines are used for testing.

All calculations use the same principle: **Part ÷ Whole × 100 = Percentage**
