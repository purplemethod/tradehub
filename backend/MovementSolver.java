import java.util.*;

public class MovementSolver {

    enum Direction {
        RIGHT, DOWN, LEFT, UP;

        public Direction turnLeft() {
            return values()[(ordinal() + 3) % 4];
        }

        public Direction turnRight() {
            return values()[(ordinal() + 1) % 4];
        }

        public int[] moveForward(int x, int y) {
            switch (this) {
                case RIGHT: return new int[]{x + 1, y};
                case LEFT: return new int[]{x - 1, y};
                case UP: return new int[]{x, y + 1};
                case DOWN: return new int[]{x, y - 1};
                default: throw new IllegalStateException();
            }
        }

        public int[] moveBack(int x, int y) {
            switch (this) {
                case RIGHT: return new int[]{x - 1, y};
                case LEFT: return new int[]{x + 1, y};
                case UP: return new int[]{x, y - 1};
                case DOWN: return new int[]{x, y + 1};
                default: throw new IllegalStateException();
            }
        }
    }

    public static String findFirstInstruction(List<String> instructions, int targetX, int targetY) {
        List<String> possible = List.of("FORWARD", "BACK", "TURN LEFT", "TURN RIGHT");

        for (String candidate : possible) {
            int x = 0, y = 0;
            Direction dir = Direction.RIGHT;

            // Testa candidate como primeira instrução
            List<String> trial = new ArrayList<>(instructions);
            trial.set(0, candidate);

            for (String instr : trial) {
                switch (instr) {
                    case "FORWARD":
                        int[] fwd = dir.moveForward(x, y);
                        x = fwd[0]; y = fwd[1];
                        break;
                    case "BACK":
                        int[] back = dir.moveBack(x, y);
                        x = back[0]; y = back[1];
                        break;
                    case "TURN LEFT":
                        dir = dir.turnLeft();
                        break;
                    case "TURN RIGHT":
                        dir = dir.turnRight();
                        break;
                }
            }

            if (x == targetX && y == targetY) {
                return "The first instruction should be " + candidate + " to reach the target " + x + "," + y;
            }
        }

        return "No valid instruction found to reach the target.";
    }

    // Exemplo de uso
    public static void main(String[] args) {
        List<String> instructions = new ArrayList<>(List.of("???", "FORWARD", "TURN LEFT", "FORWARD"));
        int targetX = 0;
        int targetY = 1;
        System.out.println(findFirstInstruction(instructions, targetX, targetY));
    }
}
