import java.util.*;

public class DirectionSolver {

    enum Direction {
        RIGHT, DOWN, LEFT, UP;

        Direction turnLeft()  { return values()[(ordinal() + 3) % 4]; }
        Direction turnRight() { return values()[(ordinal() + 1) % 4]; }

        int[] move(int x, int y, boolean forward) {
            int dx = 0, dy = 0;
            switch (this) {
                case RIGHT -> dx = 1;
                case LEFT  -> dx = -1;
                case UP    -> dy = 1;
                case DOWN  -> dy = -1;
            }
            return new int[]{ x + (forward ? dx : -dx), y + (forward ? dy : -dy) };
        }
    }

    public static String findMissingFirstInstruction(List<String> instructions, int targetX, int targetY) {
        List<String> candidates = List.of("FORWARD", "BACK", "TURN LEFT", "TURN RIGHT");

        for (String candidate : candidates) {
            Direction dir = Direction.RIGHT;
            int x = 0, y = 0;

            List<String> trial = new ArrayList<>(instructions);
            trial.set(0, candidate);

            for (String cmd : trial) {
                switch (cmd) {
                    case "FORWARD"     -> { int[] p = dir.move(x, y, true);  x = p[0]; y = p[1]; }
                    case "BACK"        -> { int[] p = dir.move(x, y, false); x = p[0]; y = p[1]; }
                    case "TURN LEFT"   -> dir = dir.turnLeft();
                    case "TURN RIGHT"  -> dir = dir.turnRight();
                }
            }

            if (x == targetX && y == targetY)
                return "The first instruction should be " + candidate + " to reach the target " + x + "," + y;
        }

        return "No valid instruction found to reach the target.";
    }
}
