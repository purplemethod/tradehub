import java.util.*;

public class MovementSimulator {

    enum Direction {
        RIGHT, DOWN, LEFT, UP;

        public Direction turn(String turn) {
            return switch (turn) {
                case "TURN LEFT" -> values()[(ordinal() + 3) % 4]; // -1 mod 4
                case "TURN RIGHT" -> values()[(ordinal() + 1) % 4];
                case "BACK" -> values()[(ordinal() + 2) % 4];
                default -> this;
            };
        }
    }

    static int[][] deltas = {
            { 1, 0 }, // RIGHT
            { 0, -1 }, // DOWN
            { -1, 0 }, // LEFT
            { 0, 1 } // UP
    };

    public static String findMissingFirstInstruction(List<String> instructions, int[] target) {
        List<String> options = List.of("FORWARD", "TURN LEFT", "TURN RIGHT", "BACK");

        for (String option : options) {
            if (reachesTarget(option, instructions, target)) {
                return option;
            }
        }

        return "NO VALID INSTRUCTION FOUND";
    }

    // private static boolean reachesTarget(String first, List<String> rest, int[]
    // target) {
    // int x = 0, y = 0;
    // Direction dir = Direction.RIGHT;

    // List<String> fullInstructions = new ArrayList<>();
    // fullInstructions.add(first);
    // fullInstructions.addAll(rest);

    // for (String instr : fullInstructions) {
    // if (instr.equals("FORWARD")) {
    // int[] move = deltas[dir.ordinal()];
    // x += move[0];
    // y += move[1];
    // } else {
    // dir = dir.turn(instr);
    // }
    // }

    // return x == target[0] && y == target[1];
    // }

    private static boolean reachesTarget(String first, List<String> rest, int[] target) {
        int x = 0, y = 0;
        Direction dir = Direction.RIGHT;

        List<String> fullInstructions = new ArrayList<>();
        fullInstructions.add(first);
        fullInstructions.addAll(rest);

        for (String instr : fullInstructions) {
            if (instr.equals("FORWARD")) {
                int[] move = deltas[dir.ordinal()];
                x += move[0];
                y += move[1];
            } else {
                dir = dir.turn(instr);
            }
        }

        boolean success = x == target[0] && y == target[1];
        if (success) {
            System.out.printf("Success with first='%s' -> reached (%d,%d)\n", first, x, y);
        } else {
            System.out.printf("Fail with first='%s' -> ended at (%d,%d), target=(%d,%d)\n",
                    first, x, y, target[0], target[1]);
        }

        return success;
    }

    // Exemplo de uso
    public static void main(String[] args) {
        List<String> instructions = List.of("TURN RIGHT", "FORWARD", "FORWARD");

        int[] target = { 1, -2 };

        String result = findMissingFirstInstruction(instructions, target);
        System.out.println("Missing first instruction: " + result);
    }
}
