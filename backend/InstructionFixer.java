import java.util.*;

public class InstructionFixer {

    // Possíveis direções que o personagem pode estar virado
    enum Direction {
        RIGHT, DOWN, LEFT, UP;

        // Gira 90° para a esquerda
        public Direction turnLeft() {
            return values()[(this.ordinal() + 3) % 4];
        }

        // Gira 90° para a direita
        public Direction turnRight() {
            return values()[(this.ordinal() + 1) % 4];
        }

        // Gira 180°
        public Direction turnBack() {
            return values()[(this.ordinal() + 2) % 4];
        }
    }

    // Simula os movimentos a partir de uma direção inicial e uma lista de instruções
    public static int[] simulate(Direction dir, List<String> instructions) {
        int x = 0, y = 0;
        Direction currentDir = dir;

        for (String instruction : instructions) {
            switch (instruction) {
                case "TURN LEFT":
                    currentDir = currentDir.turnLeft();
                    break;
                case "TURN RIGHT":
                    currentDir = currentDir.turnRight();
                    break;
                case "BACK":
                    currentDir = currentDir.turnBack();
                    break;
                case "FORWARD":
                    // Move uma unidade na direção atual
                    switch (currentDir) {
                        case RIGHT: x++; break;
                        case LEFT:  x--; break;
                        case UP:    y++; break;
                        case DOWN:  y--; break;
                    }
                    break;
            }
        }

        return new int[]{x, y};
    }

    // Encontra a instrução correta que deveria estar na primeira posição
    public static String findFirstInstruction(List<String> instructions, int targetX, int targetY) {
        String[] possibleInstructions = {"FORWARD", "BACK", "TURN LEFT", "TURN RIGHT"};

        // Testa cada instrução possível como a primeira
        for (String candidate : possibleInstructions) {
            List<String> testInstructions = new ArrayList<>(instructions);
            testInstructions.add(0, candidate); // Adiciona a instrução no início

            // Simula os movimentos a partir da direção inicial (sempre virado para a direita)
            int[] result = simulate(Direction.RIGHT, testInstructions);

            // Verifica se as coordenadas finais batem com o alvo
            if (result[0] == targetX && result[1] == targetY) {
                return "The first instruction should be " + candidate + " to reach the target " + targetX + "," + targetY + ".";
            }
        }

        return "No valid instruction found to reach the target.";
    }

    // Exemplo de uso
    public static void main(String[] args) {
        List<String> instructions = Arrays.asList("TURN LEFT", "FORWARD", "FORWARD");
        int targetX = 0;
        int targetY = 2;

        String result = findFirstInstruction(instructions, targetX, targetY);
        System.out.println(result);  // The first instruction should be TURN LEFT to reach the target 0,2.
    }
}
